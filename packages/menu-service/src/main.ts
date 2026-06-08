import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { MenuModule } from './menu.module';

async function bootstrap() {
  const app = await NestFactory.create(MenuModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3002;
  await app.listen(port);
  console.log(`[Menu Service] Running on port ${port}`);
}
bootstrap();
