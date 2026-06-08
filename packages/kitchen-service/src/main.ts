import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { KitchenModule } from './kitchen.module';

async function bootstrap() {
  const app = await NestFactory.create(KitchenModule);
  app.enableCors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3004;
  await app.listen(port);
  console.log(`[Kitchen Service] Running on port ${port}`);
}
bootstrap();
