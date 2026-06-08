import {
  Controller, Get, Post, Patch, Body, Param, Query, ParseUUIDPipe, ParseBoolPipe,
} from '@nestjs/common';
import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsInt, Min, MinLength } from 'class-validator';
import { MenuService } from './menu.service';
import { Auth } from '@restaurant/auth-guard';
import { Role } from '@restaurant/shared-types';

class CreateMenuItemDto {
  @IsString() categoryId: string;
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() description?: string;
  @IsNumber() @Min(0) price: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsArray() options?: Array<{ id: string; name: string; priceModifier: number }>;
}

class UpdateAvailabilityDto {
  @IsBoolean() available: boolean;
}

class UpdateStockDto {
  @IsInt() @Min(0) stock: number;
}

class CreateCategoryDto {
  @IsString() @MinLength(2) name: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}

@Controller()
export class MenuController {
  constructor(private menuService: MenuService) {}

  @Get('menu/categories')
  getCategories() {
    return this.menuService.getCategories();
  }

  @Get('menu/items')
  getItems(
    @Query('categoryId') categoryId?: string,
    @Query('available') available?: string,
  ) {
    const avail = available !== undefined ? available === 'true' : undefined;
    return this.menuService.getItems(categoryId, avail);
  }

  @Get('menu/items/:id')
  getItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.menuService.getItemById(id);
  }

  @Post('menu/items')
  @Auth(Role.ADMIN)
  createItem(@Body() dto: CreateMenuItemDto) {
    return this.menuService.createItem(dto);
  }

  @Patch('menu/items/:id/availability')
  @Auth(Role.ADMIN, Role.CHEF)
  updateAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.menuService.updateAvailability(id, dto.available);
  }

  @Patch('menu/items/:id/stock')
  @Auth(Role.ADMIN)
  updateStock(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStockDto,
  ) {
    return this.menuService.updateStock(id, dto.stock);
  }

  @Post('menu/categories')
  @Auth(Role.ADMIN)
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.menuService.createCategory(dto);
  }
}
