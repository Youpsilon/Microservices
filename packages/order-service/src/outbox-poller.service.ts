import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Outbox } from './entities/order.entity';
import { connectAmqp, setupExchange, publishEvent } from '@restaurant/amqp-utils';
import { Exchanges } from '@restaurant/shared-types';
import * as amqp from 'amqplib';

// Explicit mapping: aggregateType → exchange name (robust, no silent message loss)
const AGGREGATE_TO_EXCHANGE: Record<string, string> = {
  Order: Exchanges.ORDER,
  Kitchen: Exchanges.KITCHEN,
  Delivery: Exchanges.DELIVERY,
  Menu: Exchanges.MENU,
  Auth: Exchanges.AUTH,
};

@Injectable()
export class OutboxPoller {
  private readonly logger = new Logger(OutboxPoller.name);
  private channel: amqp.Channel | null = null;

  constructor(
    @InjectRepository(Outbox) private outboxRepo: Repository<Outbox>,
  ) {}

  async onModuleInit() {
    try {
      this.channel = await connectAmqp();
      await setupExchange(this.channel, Exchanges.ORDER);
      this.logger.log('Outbox poller connected to RabbitMQ');
    } catch (err) {
      this.logger.error('Failed to connect outbox poller to RabbitMQ', err);
    }
  }

  @Cron(CronExpression.EVERY_SECOND)
  async pollAndPublish() {
    if (!this.channel) return;

    const events = await this.outboxRepo.find({
      where: { published: false },
      order: { createdAt: 'ASC' },
      take: 50,
    });

    for (const event of events) {
      try {
        const exchange = AGGREGATE_TO_EXCHANGE[event.aggregateType];
        if (!exchange) {
          this.logger.error(
            `[Outbox] Unknown aggregateType "${event.aggregateType}" for event ${event.id} — skipping to avoid silent loss`,
          );
          continue;
        }

        await publishEvent(
          this.channel,
          exchange,
          event.eventType,
          event.payload,
        );

        await this.outboxRepo.update(event.id, { published: true });
        this.logger.log(`Published event ${event.eventType} for ${event.aggregateType}:${event.aggregateId}`);
      } catch (err) {
        this.logger.error(`Failed to publish outbox event ${event.id}`, err);
      }
    }
  }
}
