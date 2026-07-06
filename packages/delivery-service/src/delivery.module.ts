import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DeliveryController } from './delivery.controller';
import { DeliveryService } from './delivery.service';
import { Courier, Delivery, CourierLocation, Outbox, ProcessedEvent } from './entities/delivery.entity';

import { OutboxPoller } from './outbox-poller.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5437', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dev',
      database: process.env.DB_NAME || 'delivery',
      entities: [Courier, Delivery, CourierLocation, Outbox, ProcessedEvent],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([Courier, Delivery, CourierLocation, Outbox, ProcessedEvent]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, OutboxPoller],
})
export class DeliveryModule {}
