import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { KitchenTicket, TicketItem, Outbox, ProcessedEvent } from './entities/kitchen.entity';
import {
  DomainEvent, OrderPlacedPayload, EventTypes, Exchanges, KitchenItemStatus, OrderStatus,
} from '@restaurant/shared-types';
import { connectAmqp, setupExchange, setupQueue, consumeWithIdempotency, publishEvent } from '@restaurant/amqp-utils';
import * as amqp from 'amqplib';

@Injectable()
export class KitchenService {
  private readonly logger = new Logger(KitchenService.name);
  private channel: amqp.Channel | null = null;

  constructor(
    @InjectRepository(KitchenTicket) private ticketRepo: Repository<KitchenTicket>,
    @InjectRepository(TicketItem) private itemRepo: Repository<TicketItem>,
    @InjectRepository(Outbox) private outboxRepo: Repository<Outbox>,
    @InjectRepository(ProcessedEvent) private processedRepo: Repository<ProcessedEvent>,
    private dataSource: DataSource,
  ) {}

  async onModuleInit() {
    try {
      this.channel = await connectAmqp();
      await setupExchange(this.channel, Exchanges.ORDER);
      await setupExchange(this.channel, Exchanges.KITCHEN);
      await setupQueue(this.channel, 'kitchen.order-placed', Exchanges.ORDER, EventTypes.ORDER_PLACED);
      await setupQueue(this.channel, 'kitchen.order-cancelled', Exchanges.ORDER, EventTypes.ORDER_CANCELLED);
      await setupQueue(this.channel, 'kitchen.order-status-updated.v1', Exchanges.ORDER, 'order.status.updated');

      // Start consuming OrderPlaced events
      await consumeWithIdempotency(
        this.channel,
        'kitchen.order-placed',
        (event) => this.handleOrderPlaced(event as DomainEvent<OrderPlacedPayload>),
        (msgId) => this.processedRepo.findOne({ where: { messageId: msgId } }).then((e) => !!e),
        (msgId) => this.processedRepo.save(this.processedRepo.create({ messageId: msgId })).then(() => {}),
      );

      // Start consuming OrderStatusUpdated events
      await consumeWithIdempotency(
        this.channel,
        'kitchen.order-status-updated.v1',
        (event) => this.handleOrderStatusUpdated(event as DomainEvent<{ orderId: string; status: OrderStatus }>),
        (msgId) => this.processedRepo.findOne({ where: { messageId: msgId } }).then((e) => !!e),
        (msgId) => this.processedRepo.save(this.processedRepo.create({ messageId: msgId })).then(() => {}),
      );

      this.logger.log('Kitchen consumer started');
    } catch (err) {
      this.logger.error('Failed to start kitchen consumer', err);
    }
  }

  // ─── Handle OrderPlaced → Create Kitchen Ticket ───
  private async handleOrderPlaced(event: DomainEvent<OrderPlacedPayload>): Promise<void> {
    const { orderId, items } = event.payload;

    const ticket = this.ticketRepo.create({
      orderId,
      status: 'pending',
      items: items.map((i) =>
        this.itemRepo.create({
          menuItemId: i.menuItemId,
          name: i.name,
          qty: i.qty,
          notes: i.notes || '',
          status: 'pending',
        }),
      ),
    });

    await this.ticketRepo.save(ticket);
    this.logger.log(`Kitchen ticket created for order ${orderId}`);
  }

  // ─── Get Tickets ───
  async getTickets(status?: string): Promise<KitchenTicket[]> {
    const qb = this.ticketRepo.createQueryBuilder('ticket')
      .leftJoinAndSelect('ticket.items', 'items');
    if (status) {
      const statuses = status.split(',');
      qb.where('ticket.status IN (:...statuses)', { statuses });
    }
    qb.orderBy('ticket.priority', 'DESC').addOrderBy('ticket.createdAt', 'ASC');
    return qb.getMany();
  }

  // ─── Update Item Status ───
  async updateItemStatus(itemId: string, newStatus: string): Promise<TicketItem> {
    const item = await this.itemRepo.findOne({ where: { id: itemId }, relations: { ticket: true } });
    if (!item) throw new NotFoundException('Ticket item not found');

    if (!['in_progress', 'ready'].includes(newStatus)) {
      throw new BadRequestException('Invalid status');
    }

    item.status = newStatus;
    const saved = await this.itemRepo.save(item);

    // Publish event via outbox
    await this.dataSource.transaction(async (manager) => {
      await manager.save(Outbox, {
        aggregateType: 'Kitchen',
        aggregateId: item.ticket.orderId,
        eventType: newStatus === 'in_progress' ? EventTypes.KITCHEN_ITEM_IN_PROGRESS : EventTypes.KITCHEN_ITEM_READY,
        payload: {
          orderId: item.ticket.orderId,
          ticketId: item.ticketId,
          itemId: item.id,
          menuItemId: item.menuItemId,
          status: newStatus,
        },
      });
    });

    // Check if all items are ready → mark ticket as ready
    if (newStatus === 'ready') {
      await this.checkAllItemsReady(item.ticketId);
    }

    // If first item starts → mark ticket as preparing
    if (newStatus === 'in_progress') {
      const ticket = await this.ticketRepo.findOne({ where: { id: item.ticketId } });
      if (ticket && ticket.status === 'pending') {
        ticket.status = 'preparing';
        await this.ticketRepo.save(ticket);
      }
    }

    return saved;
  }

  // ─── Accept Entire Ticket ───
  async acceptTicket(ticketId: string): Promise<KitchenTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status !== 'pending') throw new BadRequestException('Ticket is not pending');

    ticket.status = 'preparing';
    const saved = await this.ticketRepo.save(ticket);

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Outbox, {
        aggregateType: 'Kitchen',
        aggregateId: ticket.orderId,
        eventType: EventTypes.ORDER_VALIDATED,
        payload: {
          orderId: ticket.orderId,
          ticketId: ticket.id,
          acceptedAt: new Date().toISOString(),
        },
      });
    });

    return saved;
  }

  // ─── Mark Entire Ticket Ready ───
  async markTicketReady(ticketId: string): Promise<KitchenTicket> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId }, relations: { items: true } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    ticket.status = 'ready';
    const saved = await this.ticketRepo.save(ticket);

    await this.dataSource.transaction(async (manager) => {
      await manager.save(Outbox, {
        aggregateType: 'Kitchen',
        aggregateId: ticket.orderId,
        eventType: EventTypes.ORDER_READY_FOR_PICKUP,
        payload: {
          orderId: ticket.orderId,
          ticketId: ticket.id,
          readyAt: new Date().toISOString(),
        },
      });
    });

    return saved;
  }

  private async checkAllItemsReady(ticketId: string): Promise<void> {
    const ticket = await this.ticketRepo.findOne({ where: { id: ticketId }, relations: { items: true } });
    if (!ticket) return;

    const allReady = ticket.items.every((i) => i.status === 'ready');
    if (allReady) {
      await this.markTicketReady(ticketId);
    }
  }

  private async handleOrderStatusUpdated(event: DomainEvent<{ orderId: string; status: OrderStatus }>): Promise<void> {
    const { orderId, status } = event.payload;
    const ticket = await this.ticketRepo.findOne({ where: { orderId } });
    if (!ticket) return;

    let targetTicketStatus = '';
    if (status === OrderStatus.PREPARING) {
      targetTicketStatus = 'preparing';
    } else if (status === OrderStatus.READY) {
      targetTicketStatus = 'ready';
    } else if (status === OrderStatus.CANCELLED) {
      targetTicketStatus = 'cancelled';
    }

    if (targetTicketStatus && ticket.status !== targetTicketStatus) {
      ticket.status = targetTicketStatus;
      await this.ticketRepo.save(ticket);
      this.logger.log(`Updated kitchen ticket for order ${orderId} to ${targetTicketStatus} due to order status update`);
    }
  }
}
