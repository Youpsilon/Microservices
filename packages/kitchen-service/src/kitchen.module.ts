import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { KitchenController } from './kitchen.controller';
import { KitchenService } from './kitchen.service';
import { KitchenTicket, TicketItem, Outbox, ProcessedEvent } from './entities/kitchen.entity';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5436', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dev',
      database: process.env.DB_NAME || 'kitchen',
      entities: [KitchenTicket, TicketItem, Outbox, ProcessedEvent],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([KitchenTicket, TicketItem, Outbox, ProcessedEvent]),
  ],
  controllers: [KitchenController],
  providers: [KitchenService],
})
export class KitchenModule {}
