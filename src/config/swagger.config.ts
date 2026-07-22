import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

/**
 * Definisi dokumen OpenAPI terpusat. Dipakai oleh `main.ts` (menyajikan Swagger
 * UI di /api/docs) maupun oleh script export (`scripts/generate-openapi.ts`)
 * yang menulis openapi.json tanpa perlu menyalakan server / koneksi DB.
 */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Library Digital API')
    .setDescription(
      [
        'REST API sistem manajemen perpustakaan (Perpustakaan v2).',
        '',
        '**Autentikasi**: sebagian besar endpoint butuh JWT Bearer token.',
        'Dapatkan token via `POST /auth/login`, lalu klik tombol **Authorize**',
        'dan tempel token-nya.',
        '',
        '**Format response**: semua response dibungkus',
        '`{ statusCode, message, data }` oleh interceptor global.',
        'Endpoint paginated mengembalikan `data: { data: [...], meta: {...} }`.',
      ].join('\n'),
    )
    .setVersion('1.0')
    // Nama default 'bearer' agar cocok dengan @ApiBearerAuth() (tanpa argumen)
    // yang dipakai di semua controller — kalau namanya beda, tombol Authorize
    // tidak akan mengirim token ke endpoint.
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Tempel access_token hasil login',
    })
    .addTag('Auth', 'Registrasi, login, profil')
    .addTag('Users', 'Manajemen user (admin)')
    .addTag('Books', 'Buku dan eksemplar fisik')
    .addTag('Authors', 'Penulis')
    .addTag('Categories', 'Kategori buku')
    .addTag('Publishers', 'Penerbit')
    .addTag('Languages', 'Bahasa')
    .addTag('Transactions', 'Peminjaman & pengembalian')
    .addTag('Dashboard', 'Ringkasan statistik')
    .addTag('Activity Logs', 'Audit log aktivitas')
    .addTag('Articles', 'Artikel/berita')
    .build();

  return SwaggerModule.createDocument(app, config);
}
