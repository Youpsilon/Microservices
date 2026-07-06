import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Courier, Delivery, CourierLocation, Outbox, ProcessedEvent } from './entities/delivery.entity';
import {
  DomainEvent, EventTypes, Exchanges, OrderReadyForPickupPayload, OrderStatus,
} from '@restaurant/shared-types';
import { connectAmqp, setupExchange, setupQueue, consumeWithIdempotency } from '@restaurant/amqp-utils';
import * as amqp from 'amqplib';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private channel: amqp.Channel | null = null;

  constructor(
    @InjectRepository(Courier) private courierRepo: Repository<Courier>,
    @InjectRepository(Delivery) private deliveryRepo: Repository<Delivery>,
    @InjectRepository(CourierLocation) private locationRepo: Repository<CourierLocation>,
    @InjectRepository(Outbox) private outboxRepo: Repository<Outbox>,
    @InjectRepository(ProcessedEvent) private processedRepo: Repository<ProcessedEvent>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      this.channel = await connectAmqp();
      await setupExchange(this.channel, Exchanges.KITCHEN);
      await setupExchange(this.channel, Exchanges.DELIVERY);
      await setupQueue(this.channel, 'delivery.order-ready', Exchanges.KITCHEN, EventTypes.ORDER_READY_FOR_PICKUP);
      await setupQueue(this.channel, 'delivery.order-status-updated.v1', Exchanges.ORDER, 'order.status.updated');

      await consumeWithIdempotency(
        this.channel,
        'delivery.order-ready',
        (event) => this.handleOrderReady(event as DomainEvent<OrderReadyForPickupPayload>),
        (msgId) => this.processedRepo.findOne({ where: { messageId: msgId } }).then((e) => !!e),
        (msgId) => this.processedRepo.save(this.processedRepo.create({ messageId: msgId })).then(() => {}),
      );

      await consumeWithIdempotency(
        this.channel,
        'delivery.order-status-updated.v1',
        (event) => this.handleOrderStatusUpdated(event as DomainEvent<{ orderId: string; status: OrderStatus }>),
        (msgId) => this.processedRepo.findOne({ where: { messageId: msgId } }).then((e) => !!e),
        (msgId) => this.processedRepo.save(this.processedRepo.create({ messageId: msgId })).then(() => {}),
      );

      // Seed default courier if none exist
      await this.seedCouriers();
      this.logger.log('Delivery consumer started');
    } catch (err) {
      this.logger.error('Failed to start delivery consumer', err);
    }
  }

  private async handleOrderReady(event: DomainEvent<OrderReadyForPickupPayload>): Promise<void> {
    const { orderId } = event.payload;

    // Create a delivery request
    const delivery = this.deliveryRepo.create({
      orderId,
      status: 'pending',
    });
    await this.deliveryRepo.save(delivery);

    this.logger.log(`Delivery created for order ${orderId}, pending assignment`);
  }

  // ─── Couriers ───
  async getCouriers(status?: string): Promise<Courier[]> {
    if (status) return this.courierRepo.find({ where: { status } });
    return this.courierRepo.find();
  }

  async updateCourierStatus(courierId: string, status: string): Promise<Courier> {
    const courier = await this.courierRepo.findOne({ where: { id: courierId } });
    if (!courier) throw new NotFoundException('Courier not found');
    courier.status = status;
    return this.courierRepo.save(courier);
  }

  // ─── Deliveries ───
  async getDeliveries(status?: string, courierId?: string): Promise<Delivery[]> {
    const where: any = {};
    if (status) where.status = status;
    if (courierId) where.courierId = courierId;
    return this.deliveryRepo.find({ where, relations: { courier: true }, order: { createdAt: 'DESC' } });
  }

  async assignDelivery(deliveryId: string, courierId: string): Promise<Delivery> {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException('Delivery not found');

    const courier = await this.courierRepo.findOne({ where: { id: courierId } });
    if (!courier) throw new NotFoundException('Courier not found');

    delivery.courierId = courierId;
    delivery.status = 'assigned';
    delivery.eta = new Date(Date.now() + 30 * 60 * 1000); // 30min ETA
    const saved = await this.deliveryRepo.save(delivery);

    // Mark courier busy
    courier.status = 'busy';
    await this.courierRepo.save(courier);

    // Publish event
    await this.dataSource.transaction(async (manager) => {
      await manager.save(Outbox, {
        aggregateType: 'Delivery',
        aggregateId: delivery.orderId,
        eventType: EventTypes.DELIVERY_ASSIGNED,
        payload: {
          deliveryId: delivery.id,
          orderId: delivery.orderId,
          courierId,
          eta: delivery.eta?.toISOString(),
        },
      });
    });

    return saved;
  }

  async updateDeliveryStatus(deliveryId: string, status: string): Promise<Delivery> {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId }, relations: { courier: true } });
    if (!delivery) throw new NotFoundException('Delivery not found');

    delivery.status = status;
    const saved = await this.deliveryRepo.save(delivery);

    let eventType = '';
    if (status === 'picked_up') eventType = EventTypes.DELIVERY_PICKED_UP;
    else if (status === 'completed') {
      eventType = EventTypes.DELIVERY_COMPLETED;
      // Free up courier
      if (delivery.courier) {
        delivery.courier.status = 'available';
        await this.courierRepo.save(delivery.courier);
      }
    }

    if (eventType) {
      await this.dataSource.transaction(async (manager) => {
        await manager.save(Outbox, {
          aggregateType: 'Delivery',
          aggregateId: delivery.orderId,
          eventType,
          payload: {
            deliveryId: delivery.id,
            orderId: delivery.orderId,
            courierId: delivery.courierId,
            completedAt: status === 'completed' ? new Date().toISOString() : undefined,
          },
        });
      });
    }

    return saved;
  }

  // ─── Location Updates ───
  async updateLocation(deliveryId: string, lat: number, lng: number): Promise<void> {
    const delivery = await this.deliveryRepo.findOne({ where: { id: deliveryId } });
    if (!delivery) throw new NotFoundException('Delivery not found');

    if (!delivery.courierId) {
      throw new BadRequestException('Delivery has no assigned courier');
    }

    await this.locationRepo.save(this.locationRepo.create({
      courierId: delivery.courierId,
      deliveryId,
      lat,
      lng,
    }));

    // Update courier current location
    await this.courierRepo.update(delivery.courierId, {
      currentLocation: { lat, lng },
    });
  }

  private async seedCouriers() {
    const exists = await this.courierRepo.findOne({ where: { name: 'Pierre Livreur' } });
    const count = await this.courierRepo.count();

    // If there are other couriers in the DB, clean them up to ensure Pierre Livreur is the only one
    if (count > 1 || (count === 1 && !exists)) {
      this.logger.log('Cleaning up old couriers and references...');
      await this.locationRepo.createQueryBuilder().delete().execute();
      await this.deliveryRepo.createQueryBuilder().update().set({ courierId: null }).execute();
      await this.courierRepo.createQueryBuilder().delete().execute();
    }

    const newCount = await this.courierRepo.count();
    if (newCount === 0) {
      await this.courierRepo.save(
        this.courierRepo.create({
          name: 'Pierre Livreur',
          phone: '0612345678',
          vehicle: 'scooter',
          status: 'available',
        })
      );
      this.logger.log('Seeded Pierre Livreur');
    }
  }

  private async handleOrderStatusUpdated(event: DomainEvent<{ orderId: string; status: OrderStatus }>): Promise<void> {
    const { orderId, status } = event.payload;
    let delivery = await this.deliveryRepo.findOne({ where: { orderId }, relations: { courier: true } });

    if (status === OrderStatus.READY) {
      if (!delivery) {
        delivery = this.deliveryRepo.create({
          orderId,
          status: 'pending',
        });
        await this.deliveryRepo.save(delivery);
        this.logger.log(`Created delivery for order ${orderId} due to READY status update`);
      }
    } else if (status === OrderStatus.DELIVERING) {
      if (delivery && delivery.status !== 'picked_up') {
        delivery.status = 'picked_up';
        await this.deliveryRepo.save(delivery);
        this.logger.log(`Updated delivery status to picked_up for order ${orderId} due to status update`);
      }
    } else if (status === OrderStatus.DELIVERED || status === OrderStatus.COMPLETED) {
      if (delivery && delivery.status !== 'completed') {
        delivery.status = 'completed';
        const saved = await this.deliveryRepo.save(delivery);
        if (saved.courier) {
          saved.courier.status = 'available';
          await this.courierRepo.save(saved.courier);
        }
        this.logger.log(`Updated delivery status to completed for order ${orderId} due to status update`);
      }
    } else if (status === OrderStatus.CANCELLED) {
      if (delivery && delivery.status !== 'cancelled') {
        delivery.status = 'cancelled';
        const saved = await this.deliveryRepo.save(delivery);
        if (saved.courier) {
          saved.courier.status = 'available';
          await this.courierRepo.save(saved.courier);
        }
        this.logger.log(`Cancelled delivery for order ${orderId} due to status update`);
      }
    }
  }
}
