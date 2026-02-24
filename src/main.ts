import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Prefix API
  app.setGlobalPrefix('api/v1');

  // 2. CORS - agar frontend bisa akses backend
  app.enableCors();

  // 3. Global Interceptor - format response konsisten { statusCode, message, data }
  app.useGlobalInterceptors(new ResponseInterceptor());

  // 4. Global Exception Filter - format error konsisten
  app.useGlobalFilters(new AllExceptionsFilter());

  // 5. Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
