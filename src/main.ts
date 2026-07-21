import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { SwaggerModule } from '@nestjs/swagger';
import { ActivityLogsService } from './modules/activity-logs/activity-logs.service';
import { ActivityLogInterceptor } from './common/interceptors/activity-logs.interceptor';
import { buildOpenApiDocument } from './config/swagger.config';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  // Batasi origin ke daftar di CORS_ORIGIN (comma-separated).
  // - Bila diset: hanya origin tersebut yang diizinkan, boleh pakai credentials.
  // - Bila tidak diset di production: fail-closed (tolak semua cross-origin),
  //   supaya deploy yang lupa mengeset CORS_ORIGIN tidak diam-diam allow-all.
  // - Bila tidak diset di non-production: allow-all TANPA credentials (dev lokal).
  //   Wildcard tidak pernah digabung dengan credentials (dilarang spec CORS).
  const allowedOrigins = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins, credentials: true });
  } else if (process.env.NODE_ENV === 'production') {
    app.enableCors({ origin: false });
  } else {
    app.enableCors({ origin: true });
  }

  app.useGlobalInterceptors(new ResponseInterceptor());

  app.useGlobalFilters(new AllExceptionsFilter());

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

  const activityLogsService = app.get(ActivityLogsService);
  app.useGlobalInterceptors(new ActivityLogInterceptor(activityLogsService));

  const document = buildOpenApiDocument(app);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      // Simpan token Authorize di localStorage supaya tidak hilang saat refresh.
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
}
bootstrap();
