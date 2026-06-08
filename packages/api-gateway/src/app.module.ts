import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { OrderController } from './order.controller';

@Module({
  imports: [],
  controllers: [MenuController, OrderController],
  providers: [],
})
export class AppModule {}
