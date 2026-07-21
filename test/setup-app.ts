import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';

/**
 * Menerapkan konfigurasi request-pipeline yang sama seperti `main.ts`
 * (prefix, ValidationPipe, ResponseInterceptor, exception filter) supaya
 * e2e test berjalan terhadap perilaku HTTP yang identik dengan produksi.
 *
 * Catatan: ActivityLogInterceptor sengaja TIDAK dipasang di sini. Interceptor
 * itu menulis ke tabel activity_logs pada tiap request dan bukan bagian dari
 * perilaku fungsional yang diuji, jadi diomit agar test fokus & bersih.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1');
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
  return app;
}
