import { registerAs } from '@nestjs/config';

/**
 * Build konfigurasi database TypeORM dengan default fallback yang aman.
 * Dipakai bersama oleh runtime (via registerAs) dan TypeORM CLI (data-source.ts).
 *
 * Fail-fast: kredensial wajib diisi. Field opsional memakai fallback:
 * - port 5432, host localhost, synchronize=false di production.
 */
export interface DatabaseConfig {
  type: 'postgres';
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: { rejectUnauthorized: boolean };
  autoLoadEntities: boolean;
  synchronize: boolean;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === '') return fallback;
  return value.toLowerCase() === 'true';
}

export function buildDatabaseConfig(): DatabaseConfig {
  const missing = ['DB_USER', 'DB_PASSWORD', 'DB_NAME'].filter(
    (key) => !process.env[key] || process.env[key].trim() === '',
  );
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing.join(', ')}`,
    );
  }

  const parsedPort = parseInt(process.env.DB_PORT ?? '', 10);
  const sslEnabled = parseBoolean(process.env.DB_SSL);
  const synchronize =
    parseBoolean(process.env.DB_SYNC) && process.env.NODE_ENV !== 'production';

  return {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: Number.isNaN(parsedPort) ? 5432 : parsedPort,
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ...(sslEnabled
      ? {
          ssl: {
            rejectUnauthorized: parseBoolean(
              process.env.DB_SSL_REJECT_UNAUTHORIZED,
              true,
            ),
          },
        }
      : {}),
    autoLoadEntities: true,
    synchronize,
  };
}

export default registerAs('database', () => buildDatabaseConfig());
