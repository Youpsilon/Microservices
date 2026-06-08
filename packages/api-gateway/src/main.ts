import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  
  // Enable CORS since frontend is on a different port
  app.enableCors();

  await app.listen(3000);
  console.log('🚀 API Gateway is running on: http://localhost:3000/api');
}
bootstrap();
