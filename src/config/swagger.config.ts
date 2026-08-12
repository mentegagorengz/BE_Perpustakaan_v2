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
        '**Autentikasi**: akses token dikirim via cookie `access_token` (HttpOnly)',
        'yang diset oleh `POST /auth/login`. Endpoint proteksi membaca cookie',
        'terlebih dahulu, lalu fallback ke Bearer token.',
        '- `POST /auth/login` → set cookie `access_token` + `refresh_token` (HttpOnly), refreshToken juga di body',
        '- `POST /auth/refresh` → rotasi refresh token (grace period), cookie diperbarui',
        '- `POST /auth/logout` → revoke sesi refresh token & hapus cookie',
        '',
        '**Format response sukses**: `{ success: true, message, data, meta? }`.',
        '`meta` hanya ada pada endpoint paginated dan berada di top-level',
        '(bukan di dalam `data`), snake_case: `page | limit | total_items |',
        'total_pages | has_next_page | has_prev_page`. `data` bernilai `null`',
        'bila tidak ada payload.',
        '**Format response error**:',
        '`{ success: false, message, error: { code, details } }`',
        'dengan `details` berisi `{ field, message }[]` (validasi) atau `null`.',
        'Kode kesalahan: `BAD_REQUEST | UNAUTHORIZED | FORBIDDEN | NOT_FOUND |',
        'CONFLICT | UNPROCESSABLE_ENTITY | TOO_MANY_REQUESTS |',
        'INTERNAL_SERVER_ERROR | SERVICE_UNAVAILABLE`.',
        '',
        '**Enum buku (English)**: kondisi `GOOD | SLIGHTLY_DAMAGED |',
        'HEAVILY_DAMAGED`; status transaksi `BORROWED | RETURNED | OVERDUE`.',
        '',
        '**Soft delete**: DELETE pada users/books/items melakukan soft delete',
        '(`deleted_at`), data tetap ada tapi tidak tampil pada list/read.',
        'Histori transaksi tetap menampilkan user/buku yang sudah dihapus.',
        'Email & nomor identifikasi user yang dihapus boleh dipakai registrasi ulang.',
        '',
        '**Health**: `GET /api/v1/health` (publik) — status app + koneksi database.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Alternatif untuk cookie: tempel access_token hasil login.',
    })
    .addCookieAuth(
      'access_token',
      {
        type: 'http',
        in: 'cookie',
        name: 'access_token',
        description:
          'HttpOnly cookie access token, diset otomatis oleh POST /auth/login.',
      },
      'access_token',
    )
    .addTag('Auth', 'Registrasi, login (cookie), refresh rotation, logout')
    .addTag('Users', 'Manajemen user (admin)')
    .addTag('Books', 'Buku dan eksemplar fisik')
    .addTag('Authors', 'Penulis')
    .addTag('Categories', 'Kategori buku')
    .addTag('Publishers', 'Penerbit')
    .addTag('Languages', 'Bahasa')
    .addTag('Transactions', 'Peminjaman & pengembalian')
    .addTag('Dashboard', 'Ringkasan statistik (cache 60 detik)')
    .addTag('Activity Logs', 'Audit log aktivitas')
    .addTag('Articles', 'Artikel/berita')
    .addTag('Policy', 'Kebijakan pinjam & denda')
    .addTag('Health', 'Status aplikasi & database')
    .build();

  return SwaggerModule.createDocument(app, config);
}
