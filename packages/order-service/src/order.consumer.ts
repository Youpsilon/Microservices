import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from './order.service';
import { connectAmqp, setupExchange, setupQueue, consumeWithIdempotency } from '@restaurant/amqp-utils';
import { Exchanges, EventTypes, OrderStatus } from '@restaurant/shared-types';
import * as amqp from 'amqplib';
import { ProcessedCommand, ProcessedEvent } from './entities/order.entity';

@Injectable()
export class OrderConsumer implements OnModuleInit {
  private readonly logger = new Logger(OrderConsumer.name);
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly orderService: OrderService,
    @InjectRepository(ProcessedCommand)
    private readonly processedCommandRepository: Repository<ProcessedCommand>,
    @InjectRepository(ProcessedEvent)
    private readonly processedEventRepository: Repository<ProcessedEvent>,
  ) {}

  async onModuleInit() {
    try {
      this.channel = await connectAmqp();
      await setupExchange(this.channel, Exchanges.ORDER);
      await setupExchange(this.channel, Exchanges.KITCHEN);
      await setupExchange(this.channel, Exchanges.DELIVERY);
      
      // Setup queue for commands
      const queueName = 'order.command.queue';
      await setupQueue(this.channel, queueName, Exchanges.ORDER, 'order.create_command');

      // Consume order creation commands
      await consumeWithIdempotency(
        this.channel,
        queueName,
        async (event: any) => {
          this.logger.log(`Processing Order Command for user ${event.payload.customerId}`);
          const { customerId, items, deliveryType, deliveryAddress, promoCode, orderId } = event.payload;
          
          await this.orderService.placeOrder(
            customerId,
            items,
            deliveryType,
            deliveryAddress,
            promoCode,
            orderId
          );
        },
        async (msgId) => {
          const count = await this.processedCommandRepository.count({ where: { messageId: msgId } });
          return count > 0;
        },
        async (msgId) => {
          await this.processedCommandRepository.save({ messageId: msgId });
        }
      );

      // Listen to Kitchen Events (Ticket ready / Items in-progress)
      await setupQueue(this.channel, 'order.kitchen-events.v2', Exchanges.KITCHEN, '#');
      await consumeWithIdempotency(
        this.channel,
        'order.kitchen-events.v2',
        async (event: any) => {
          this.logger.log(`Processing Kitchen Event: ${event.type} for aggregate orderId: ${event.payload?.orderId}`);
          if (event.type === EventTypes.ORDER_VALIDATED) {
            await this.orderService.updateStatus(event.payload.orderId, OrderStatus.PREPARING);
          } else if (event.type === EventTypes.KITCHEN_ITEM_IN_PROGRESS) {
            await this.orderService.updateStatus(event.payload.orderId, OrderStatus.PREPARING);
          } else if (event.type === EventTypes.ORDER_READY_FOR_PICKUP) {
            await this.orderService.updateStatus(event.payload.orderId, OrderStatus.READY);
          }
        },
        async (msgId) => {
          const count = await this.processedEventRepository.count({ where: { messageId: msgId } });
          return count > 0;
        },
        async (msgId) => {
          await this.processedEventRepository.save({ messageId: msgId });
        }
      );

      // Listen to Delivery Events (Assigned / Picked Up / Completed)
      await setupQueue(this.channel, 'order.delivery-events.v2', Exchanges.DELIVERY, '#');
      await consumeWithIdempotency(
        this.channel,
        'order.delivery-events.v2',
        async (event: any) => {
          this.logger.log(`Processing Delivery Event: ${event.type} for orderId: ${event.payload?.orderId}`);
          if (event.type === EventTypes.DELIVERY_ASSIGNED) {
            this.logger.log(`Delivery assigned for orderId: ${event.payload?.orderId}, waiting for pickup.`);
          } else if (event.type === EventTypes.DELIVERY_PICKED_UP) {
            await this.orderService.updateStatus(event.payload.orderId, OrderStatus.DELIVERING);
          } else if (event.type === EventTypes.DELIVERY_COMPLETED) {
            await this.orderService.updateStatus(event.payload.orderId, OrderStatus.DELIVERED);
          }
        },
        async (msgId) => {
          const count = await this.processedEventRepository.count({ where: { messageId: msgId } });
          return count > 0;
        },
        async (msgId) => {
          await this.processedEventRepository.save({ messageId: msgId });
        }
      );

      this.logger.log('Order Command Consumer connected to RabbitMQ');
    } catch (err) {
      this.logger.error('Failed to start Order Command Consumer', err);
    }
  }
}

