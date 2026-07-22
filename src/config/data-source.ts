import 'reflect-metadata';
import { join } from 'path';
import { DataSource } from 'typeorm';

/**
 * DataSource khusus untuk TypeORM CLI (generate/run/revert migration).
 * Aplikasi runtime tetap memakai konfigurasi di database.config.ts + TypeOrmModule.
 *
 * CLI dijalankan terhadap hasil build (dist/), jadi glob memakai __dirname
 * agar resolve ke file .js di dist/ apapun cwd-nya. Variabel DB_* dibaca dari
 * .env via `node --env-file=.env` (lihat script di package.json).
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [join(__dirname, '..', '**', '*.entity.js')],
  migrations: [join(__dirname, '..', 'migrations', '*.js')],
  synchronize: false,
});
