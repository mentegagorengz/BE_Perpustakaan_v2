import { NestFactory } from '@nestjs/core';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument } from '../src/config/swagger.config';

/**
 * Mengekspor spesifikasi OpenAPI ke `openapi.json` di root project TANPA
 * menyalakan server atau koneksi database.
 *
 * Kuncinya `preview: true`: Nest membangun graf modul untuk keperluan metadata
 * (yang dibutuhkan SwaggerModule) tetapi TIDAK meng-instantiate provider atau
 * menjalankan lifecycle hook — jadi TypeOrmModule tidak mencoba connect ke DB.
 *
 * Jalankan: `npm run openapi:generate`
 */
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
  // eslint-disable-next-line no-console
  console.log(`✅ openapi.json ditulis (${pathCount} path) → ${outFile}`);
}

generate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Gagal generate OpenAPI:', err);
  process.exit(1);
});
