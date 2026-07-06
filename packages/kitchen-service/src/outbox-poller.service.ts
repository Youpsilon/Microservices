import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Outbox } from './entities/kitchen.entity';
import { connectAmqp, setupExchange, publishEvent } from '@restaurant/amqp-utils';
import { Exchanges } from '@restaurant/shared-types';
import * as amqp from 'amqplib';

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
      await setupExchange(this.channel, Exchanges.KITCHEN);
      this.logger.log('Kitchen Outbox poller connected to RabbitMQ');
    } catch (err) {
      this.logger.error('Failed to connect kitchen outbox poller to RabbitMQ', err);
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
        await publishEvent(
          this.channel,
          Exchanges.KITCHEN,
          event.eventType,
          event.payload,
        );

        await this.outboxRepo.update(event.id, { published: true });
        this.logger.log(`Published kitchen event ${event.eventType} for ticket ${event.aggregateId}`);
      } catch (err) {
        this.logger.error(`Failed to publish kitchen outbox event ${event.id}`, err);
      }
    }
  }
}
