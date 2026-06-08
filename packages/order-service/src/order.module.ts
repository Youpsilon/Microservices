import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OutboxPoller } from './outbox-poller.service';
import { OrderConsumer } from './order.consumer';
import { Order, OrderItem, Outbox, ProcessedEvent, ProcessedCommand } from './entities/order.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5435', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dev',
      database: process.env.DB_NAME || 'orders',
      entities: [Order, OrderItem, Outbox, ProcessedEvent, ProcessedCommand],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([Order, OrderItem, Outbox, ProcessedEvent, ProcessedCommand]),
  ],
  controllers: [OrderController],
  providers: [OrderService, OutboxPoller, OrderConsumer],
})
export class OrderModule {}

