import { Module } from '@nestjs/common';
import { MenuController } from './menu.controller';
import { OrderController } from './order.controller';
import { KitchenProxyController } from './kitchen-proxy.controller';
import { DeliveryProxyController, CourierProxyController } from './delivery-proxy.controller';
import { AuthProxyController, UsersProxyController } from './auth-proxy.controller';

@Module({
  imports: [],
  controllers: [
    MenuController,
    OrderController,
    KitchenProxyController,
    DeliveryProxyController,
    CourierProxyController,
    AuthProxyController,
    UsersProxyController,
  ],
  providers: [],
})
export class AppModule {}
