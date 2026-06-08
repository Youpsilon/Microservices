import { Controller, Get, Query, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import Redis from 'ioredis';

@Controller('menu')
export class MenuController {
  private redis: Redis;
  private readonly MENU_SERVICE_URL = 'http://localhost:3002/api/menu';

  constructor() {
    this.redis = new Redis({
      host: 'localhost',
      port: 6379,
    });
  }

  @Get('categories')
  async getCategories(@Res() res: Response) {
    const cacheKey = 'menu:categories';
    try {
      // Try to fetch from menu-service
      const response = await fetch(`${this.MENU_SERVICE_URL}/categories`);
      if (response.ok) {
        const data = await response.json();
        // Update cache
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 300); // 5 minutes expiry
        return res.json(data);
      }
      throw new Error('Menu service returned non-200');
    } catch (err) {
      // Fallback to cache if menu-service is down
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        console.log('Serving /menu/categories from Redis cache (Menu service down)');
        return res.json(JSON.parse(cached));
      }
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ message: 'Menu service is currently down and no cache is available.' });
    }
  }

  @Get('items')
  async getItems(@Query('categoryId') categoryId: string, @Res() res: Response) {
    const cacheKey = `menu:items:${categoryId || 'all'}`;
    try {
      const url = categoryId 
        ? `${this.MENU_SERVICE_URL}/items?categoryId=${categoryId}` 
        : `${this.MENU_SERVICE_URL}/items`;
        
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        await this.redis.set(cacheKey, JSON.stringify(data), 'EX', 300);
        return res.json(data);
      }
      throw new Error('Menu service returned non-200');
    } catch (err) {
      // Fallback to cache
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        console.log(`Serving /menu/items (cat: ${categoryId}) from Redis cache`);
        return res.json(JSON.parse(cached));
      }
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({ message: 'Menu service is currently down and no cache is available.' });
    }
  }
}
