import { Controller, Get, Post, Patch, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { IsString, IsNumber, IsIn, IsOptional } from 'class-validator';
import { DeliveryService } from './delivery.service';
import { Auth } from '@restaurant/auth-guard';
import { Role } from '@restaurant/shared-types';

class UpdateCourierStatusDto {
  @IsIn(['available', 'busy', 'offline']) status: string;
}

class AssignDeliveryDto {
  @IsString() courierId: string;
}

class UpdateDeliveryStatusDto {
  @IsIn(['picked_up', 'in_transit', 'completed']) status: string;
}

class UpdateLocationDto {
  @IsNumber() lat: number;
  @IsNumber() lng: number;
}

@Controller()
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('couriers')
  @Auth(Role.COURIER, Role.ADMIN)
  getCouriers(@Query('status') status?: string) {
    return this.deliveryService.getCouriers(status);
  }

  @Patch('couriers/:id/status')
  @Auth(Role.COURIER, Role.ADMIN)
  updateCourierStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourierStatusDto,
  ) {
    return this.deliveryService.updateCourierStatus(id, dto.status);
  }

  @Get('deliveries')
  @Auth(Role.COURIER, Role.ADMIN)
  getDeliveries(@Query('status') status?: string, @Query('courierId') courierId?: string) {
    return this.deliveryService.getDeliveries(status, courierId);
  }

  @Post('deliveries/:id/assign')
  @Auth(Role.ADMIN)
  assignDelivery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignDeliveryDto,
  ) {
    return this.deliveryService.assignDelivery(id, dto.courierId);
  }

  @Patch('deliveries/:id/status')
  @Auth(Role.COURIER, Role.ADMIN)
  updateDeliveryStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.updateDeliveryStatus(id, dto.status);
  }

  @Post('deliveries/:id/location')
  @Auth(Role.COURIER)
  updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.deliveryService.updateLocation(id, dto.lat, dto.lng);
  }
}
