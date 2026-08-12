import { INestApplication, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { validationExceptionFactory } from '../src/common/utils/validation-errors';

/**
 * Menerapkan konfigurasi request-pipeline yang sama seperti `main.ts`
 * (prefix, ValidationPipe) supaya e2e test berjalan terhadap perilaku HTTP
 * yang identik dengan produksi.
 *
 * ResponseInterceptor, ActivityLogInterceptor, dan AllExceptionsFilter
 * sudah terdaftar sebagai global APP_* di AppModule, sehingga tidak perlu
 * dipasang manual di sini (menghindari double-wrapping response).
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
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
  return app;
}
