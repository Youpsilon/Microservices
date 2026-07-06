import {
  Controller, Post, Get, Patch, Body, Param, Query, ParseUUIDPipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { IsString, IsArray, IsNumber, IsOptional, Min, ValidateNested, ArrayMinSize, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { OrderService } from './order.service';
import { Auth, CurrentUser } from '@restaurant/auth-guard';
import { Role, JwtPayload, OrderStatus } from '@restaurant/shared-types';

class CartItemDto {
  @IsString() menuItemId: string;
  @IsString() name: string;
  @IsNumber() @Min(1) qty: number;
  @IsNumber() @Min(0) unitPrice: number;
  @IsOptional() @IsArray() options?: string[];
  @IsOptional() @IsString() notes?: string;
}

class PlaceOrderDto {
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];

  @IsString() deliveryType: 'delivery' | 'pickup';
  @IsOptional() deliveryAddress?: Record<string, any>;
  @IsOptional() @IsString() promoCode?: string;
}

class UpdateStatusDto {
  @IsEnum(OrderStatus) status: OrderStatus;
}

@Controller()
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post('orders')
  @Auth(Role.CLIENT, Role.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  async placeOrder(@CurrentUser() user: JwtPayload, @Body() dto: PlaceOrderDto) {
    const order = await this.orderService.placeOrder(
      user.sub,
      dto.items,
      dto.deliveryType,
      dto.deliveryAddress,
      dto.promoCode,
    );
    return {
      orderId: order.id,
      status: order.status,
      total: order.total,
      message: 'Commande reçue et en cours de traitement !',
    };
  }

  @Get('orders')
  @Auth(Role.CLIENT, Role.ADMIN)
  async getOrders(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: OrderStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const isAdmin = user.roles?.includes(Role.ADMIN);
    return this.orderService.getOrders(
      isAdmin ? undefined : user.sub, // Admins see all orders
      status,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }

  @Patch('orders/:id/status')
  @Auth(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStatusDto,
  ) {
    const order = await this.orderService.updateStatus(id, dto.status);
    return { orderId: order.id, status: order.status };
  }

  @Get('orders/:id')
  @Auth(Role.CLIENT, Role.ADMIN)
  async getOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.orderService.getOrderById(id, user.sub);
  }

  @Post('orders/:id/cancel')
  @Auth(Role.CLIENT)
  @HttpCode(HttpStatus.OK)
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const order = await this.orderService.cancelOrder(id, user.sub);
    return { orderId: order.id, status: order.status };
  }

  @Post('orders/:id/confirm')
  @Auth(Role.CLIENT, Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  async confirmReception(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const order = await this.orderService.confirmReception(id, user.sub);
    return { orderId: order.id, status: order.status };
  }
}
