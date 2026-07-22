import { applyDecorators, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';

/**
 * Decorator dokumentasi terpusat. Semua response dibungkus interceptor global
 * jadi `{ statusCode, message, data }` — helper di sini mencerminkan bentuk itu
 * di OpenAPI tanpa menulis ulang response DTO per endpoint.
 */

/** 401 + 403 sekaligus. Pasang di controller ber-guard (JwtAuthGuard/RolesGuard). */
export function ApiAuthErrors() {
  return applyDecorators(
    ApiUnauthorizedResponse({ description: 'Token tidak ada / tidak valid' }),
    ApiForbiddenResponse({ description: 'Role tidak diizinkan' }),
  );
}

/** 404 untuk endpoint yang mengambil resource by id/param. */
export function ApiNotFound(resource = 'Resource') {
  return ApiNotFoundResponse({ description: `${resource} tidak ditemukan` });
}

/**
 * 200 dengan envelope `{ statusCode, message, data }`. Bila `model` diberikan,
 * `data` di-ref ke schema model itu; tanpa model, `data` generik (object).
 */
export function ApiResponseWrapped(model?: Type<unknown>, description = 'Success') {
  const data = model
    ? { $ref: getSchemaPath(model) }
    : { type: 'object' as const };

  const schema = {
    type: 'object' as const,
    properties: {
      statusCode: { type: 'number' as const, example: 200 },
      message: { type: 'string' as const, example: 'Success' },
      data,
    },
  };

  return applyDecorators(
    ...(model ? [ApiExtraModels(model)] : []),
    ApiOkResponse({ description, schema }),
  );
}
