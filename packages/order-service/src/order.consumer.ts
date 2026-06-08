import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrderService } from './order.service';
import { connectAmqp, setupExchange, setupQueue, consumeWithIdempotency } from '@restaurant/amqp-utils';
import { Exchanges } from '@restaurant/shared-types';
import * as amqp from 'amqplib';
import { ProcessedCommand } from './entities/order.entity';

@Injectable()
export class OrderConsumer implements OnModuleInit {
  private readonly logger = new Logger(OrderConsumer.name);
  private channel: amqp.Channel | null = null;

  constructor(
    private readonly orderService: OrderService,
    @InjectRepository(ProcessedCommand)
    private readonly processedCommandRepository: Repository<ProcessedCommand>,
  ) {}

  async onModuleInit() {
    try {
      this.channel = await connectAmqp();
      await setupExchange(this.channel, Exchanges.ORDER);
      
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
          
          // Place the order
          await this.orderService.placeOrder(
            customerId,
            items,
            deliveryType,
            deliveryAddress,
            promoCode,
            orderId // We pass the tracking ID so the UUID is preserved!
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

      this.logger.log('Order Command Consumer connected to RabbitMQ');
    } catch (err) {
      this.logger.error('Failed to start Order Command Consumer', err);
    }
  }
}
