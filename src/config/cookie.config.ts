import type { CookieOptions } from 'express';

/**
 * Builder opsi cookie HttpOnly yang konsisten untuk seluruh aplikasi.
 * Nilai diambil dari environment (COOKIE_DOMAIN, NODE_ENV) dengan fallback
 * aman untuk development lokal.
 */
export function buildAuthCookieOptions(
  maxAgeMs = 15 * 60 * 1000,
): CookieOptions {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: maxAgeMs,
  };
}

export const ACCESS_TOKEN_COOKIE = 'access_token';
export const REFRESH_TOKEN_COOKIE = 'refresh_token';
