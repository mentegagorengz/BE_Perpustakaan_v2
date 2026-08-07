/**
 * Validasi environment fail-fast saat aplikasi bootstrap.
 * Diwajibkan untuk variabel yang tidak punya fallback aman; sisanya diatur
 * dengan default fallback di database.config.ts / auth.
 */
const REQUIRED: ReadonlyArray<{ key: string; hint: string }> = [
  { key: 'JWT_SECRET', hint: 'at least 32 characters' },
  { key: 'DB_USER', hint: 'postgres user' },
  { key: 'DB_PASSWORD', hint: 'postgres password' },
  { key: 'DB_NAME', hint: 'postgres database name' },
];

export function validateEnvironment(env: NodeJS.ProcessEnv): void {
  const missing = REQUIRED.filter(({ key }) => {
    const value = env[key];
    return value === undefined || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variable(s): ${missing
        .map(({ key, hint }) => `${key} (${hint})`)
        .join(', ')}`,
    );
  }

  if ((env.JWT_SECRET?.length ?? 0) < 32) {
    throw new Error(
      'JWT_SECRET must be set and at least 32 characters long in .env',
    );
  }
}
