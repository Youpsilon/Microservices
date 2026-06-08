import { Controller, Get, Patch, Post, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { KitchenService } from './kitchen.service';
import { Auth } from '@restaurant/auth-guard';
import { Role } from '@restaurant/shared-types';

class UpdateItemStatusDto {
  @IsIn(['in_progress', 'ready'])
  status: string;
}

@Controller()
export class KitchenController {
  constructor(private kitchenService: KitchenService) {}

  @Get('kitchen/orders')
  @Auth(Role.CHEF, Role.ADMIN)
  getTickets(@Query('status') status?: string) {
    return this.kitchenService.getTickets(status);
  }

  @Patch('kitchen/items/:itemId/status')
  @Auth(Role.CHEF, Role.ADMIN)
  updateItemStatus(
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() dto: UpdateItemStatusDto,
  ) {
    return this.kitchenService.updateItemStatus(itemId, dto.status);
  }

  @Post('kitchen/orders/:ticketId/ready')
  @Auth(Role.CHEF, Role.ADMIN)
  markReady(@Param('ticketId', ParseUUIDPipe) ticketId: string) {
    return this.kitchenService.markTicketReady(ticketId);
  }
}
