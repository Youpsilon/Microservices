import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderItem, Outbox } from './entities/order.entity';
import {
  OrderStatus,
  EventTypes,
  Exchanges,
  OrderPlacedPayload,
} from '@restaurant/shared-types';
import { v4 as uuidv4 } from 'uuid';
import { connectAmqp, setupExchange, publishEvent, getChannel } from '@restaurant/amqp-utils';

interface CartItem {
  menuItemId: string;
  name: string;
  qty: number;
  unitPrice: number;
  options?: string[];
  notes?: string;
}

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(Outbox) private outboxRepo: Repository<Outbox>,
    private dataSource: DataSource,
  ) {}

  // ─── Place Order (Transactional Outbox) ───
  async placeOrder(
    customerId: string,
    items: CartItem[],
    deliveryType: 'delivery' | 'pickup',
    deliveryAddress?: Record<string, any>,
    promoCode?: string,
    predefinedOrderId?: string
  ): Promise<Order> {
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    return this.dataSource.transaction(async (manager) => {
      const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.qty, 0);
      const total = subtotal; // Apply promo code logic here if needed

      const order = manager.create(Order, {
        ...(predefinedOrderId ? { id: predefinedOrderId } : {}),
        customerId,
        status: OrderStatus.PENDING,
        deliveryType,
        deliveryAddress,
        subtotal,
        total,
        promoCode,
        items: items.map((i) =>
          manager.create(OrderItem, {
            menuItemId: i.menuItemId,
            name: i.name,
            qty: i.qty,
            unitPrice: i.unitPrice,
            options: i.options,
            notes: i.notes,
            status: 'pending',
          }),
        ),
      });

      const saved = await manager.save(order);

      // Write to outbox (SAME transaction = atomicity guaranteed)
      const eventPayload: OrderPlacedPayload = {
        orderId: saved.id,
        customerId,
        items: saved.items.map((i) => ({
          menuItemId: i.menuItemId,
          name: i.name,
          qty: i.qty,
          unitPrice: Number(i.unitPrice),
          options: i.options,
          notes: i.notes,
        })),
        deliveryType,
        deliveryAddress: deliveryAddress ? JSON.stringify(deliveryAddress) : undefined,
        total: Number(saved.total),
      };

      await manager.save(Outbox, {
        aggregateType: 'Order',
        aggregateId: saved.id,
        eventType: EventTypes.ORDER_PLACED,
        payload: eventPayload as any,
      });

      return saved;
    });
  }

  // ─── Get Orders ───
  async getOrders(customerId: string | undefined, status?: OrderStatus, page = 1, limit = 20): Promise<{ data: Order[]; meta: { page: number; limit: number; total: number } }> {
    const qb = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items');

    if (customerId) {
      qb.where('order.customerId = :customerId', { customerId });
    }

    if (status) qb.andWhere('order.status = :status', { status });
    qb.orderBy('order.createdAt', 'DESC');

    const total = await qb.getCount();
    const data = await qb.skip((page - 1) * limit).take(limit).getMany();

    return { data, meta: { page, limit, total } };
  }

  // ─── Get Single Order ───
  async getOrderById(orderId: string, customerId?: string): Promise<Order> {
    const where: any = { id: orderId };
    if (customerId) where.customerId = customerId;

    const order = await this.orderRepo.findOne({
      where,
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  // ─── Cancel Order ───
  async cancelOrder(orderId: string, customerId: string): Promise<Order> {
    const order = await this.getOrderById(orderId, customerId);

    const cancellableStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED];
    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException(`Cannot cancel order in status ${order.status}`);
    }

    return this.dataSource.transaction(async (manager) => {
      order.status = OrderStatus.CANCELLED;
      const saved = await manager.save(order);

      await manager.save(Outbox, {
        aggregateType: 'Order',
        aggregateId: saved.id,
        eventType: EventTypes.ORDER_CANCELLED,
        payload: { orderId: saved.id, customerId, cancelledAt: new Date().toISOString() },
      });

      await manager.save(Outbox, {
        aggregateType: 'Order',
        aggregateId: saved.id,
        eventType: 'order.status.updated',
        payload: { orderId: saved.id, status: OrderStatus.CANCELLED },
      });

      return saved;
    });
  }

  // ─── Update Order Status (called by saga/event consumers) ───
  async updateStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOne(Order, { where: { id: orderId } });
      if (!order) throw new NotFoundException('Order not found');
      order.status = newStatus;
      const saved = await manager.save(order);

      await manager.save(Outbox, {
        aggregateType: 'Order',
        aggregateId: saved.id,
        eventType: 'order.status.updated',
        payload: { orderId: saved.id, status: newStatus },
      });

      return saved;
    });
  }

  // ─── Confirm Reception (client confirms delivery) ───
  async confirmReception(orderId: string, customerId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (order.customerId !== customerId) {
      throw new BadRequestException('You can only confirm your own orders');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `Cannot confirm order in status "${order.status}". Order must be delivered first.`,
      );
    }

    return this.updateStatus(orderId, OrderStatus.COMPLETED);
  }
}
