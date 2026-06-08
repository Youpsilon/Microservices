import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';
import { Category, MenuItem } from './entities/menu.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5434', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dev',
      database: process.env.DB_NAME || 'menu',
      entities: [Category, MenuItem],
      synchronize: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([Category, MenuItem]),
  ],
  controllers: [MenuController],
  providers: [MenuService],
})
export class MenuModule implements OnModuleInit {
  constructor(private menuService: MenuService) {}

  async onModuleInit() {
    await this.menuService.seedIfEmpty();
  }
}
