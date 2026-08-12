import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { buildOpenApiDocument } from './config/swagger.config';
import { validateEnvironment } from './config/env.validation';
import { validationExceptionFactory } from './common/utils/validation-errors';

async function bootstrap() {
  validateEnvironment(process.env);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(helmet());
  app.use(cookieParser());
  app.set('trust proxy', 1);

  // Batasi origin ke daftar di CORS_ORIGIN (comma-separated).
  // - Bila diset: hanya origin tersebut yang diizinkan, boleh pakai credentials.
  // - Bila tidak diset di production: fail-closed (tolak semua cross-origin).
  // - Bila tidak diset di non-production: allow-all TANPA credentials (dev lokal).
  const allowedOrigins = (
    process.env.CORS_ORIGIN || 'http://localhost:3001,http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins, credentials: true });
  } else if (process.env.NODE_ENV === 'production') {
    app.enableCors({ origin: false });
  } else {
    app.enableCors({ origin: true, credentials: true });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: validationExceptionFactory,
    }),
  );

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      // Simpan token Authorize di localStorage supaya tidak hilang saat refresh.
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
}

void bootstrap();
