/**
 * Ekspor spesifikasi OpenAPI ke `openapi.json` di root project TANPA
 * menyalakan server atau koneksi database.
 *
 * Wajib dijalankan SETELAH `npm run build` (nest build) karena schema model
 * di-generate oleh plugin @nestjs/swagger (introspectComments) saat kompilasi
 * — module di-import dari `dist` agar metadata `_OPENAPI_METADATA_FACTORY`
 * tersedia.
 *
 * Jalankan: `npm run openapi:generate`
 */
const { NestFactory } = require('@nestjs/core');
const { writeFileSync, mkdirSync } = require('fs');
const { join } = require('path');
const { AppModule } = require('../dist/app.module');
const { buildOpenApiDocument } = require('../dist/config/swagger.config');

async function generate() {
  const app = await NestFactory.create(AppModule, {
    preview: true,
    logger: false,
  });

  const document = buildOpenApiDocument(app);

  const outDir = join(__dirname, '..');
  mkdirSync(outDir, { recursive: true });
  const outFile = join(outDir, 'openapi.json');
  writeFileSync(outFile, JSON.stringify(document, null, 2), 'utf-8');

  await app.close();

  const pathCount = Object.keys(document.paths ?? {}).length;
  console.log(`✅ openapi.json ditulis (${pathCount} path) → ${outFile}`);
}

generate().catch((err) => {
  console.error('Gagal generate OpenAPI:', err);
  process.exit(1);
});
