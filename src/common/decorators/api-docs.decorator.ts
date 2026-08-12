import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';

/**
 * Decorator dokumentasi terpusat. Semua response dibungkus interceptor global
 * jadi `{ success, message, data, meta? }`; error via filter global jadi
 * `{ success: false, message, error: { code, details } }`.
 * Helper di sini mencerminkan bentuk itu di OpenAPI.
 */

const ERROR_DETAILS_SCHEMA = {
  oneOf: [
    {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          field: { type: 'string', example: 'email' },
          message: { type: 'string', example: 'Email sudah terdaftar' },
        },
      },
    },
    { type: 'null' },
  ],
  example: null,
};

function buildErrorSchema(code: string, description: string) {
  return {
    type: 'object' as const,
    properties: {
      success: { type: 'boolean' as const, example: false },
      message: { type: 'string' as const, example: description },
      error: {
        type: 'object' as const,
        properties: {
          code: { type: 'string' as const, example: code },
          details: ERROR_DETAILS_SCHEMA,
        },
      },
    },
    required: ['success', 'message', 'error'],
  };
}

/** Envelope error `{ success:false, message, error:{ code, details } }`. */
export function ApiErrorEnvelope(
  status: number,
  code: string,
  description: string,
) {
  return ApiResponse({
    status,
    description,
    schema: buildErrorSchema(code, description),
  });
}

/** 401 + 403 sekaligus. Pasang di controller ber-guard (JwtAuthGuard/RolesGuard). */
export function ApiAuthErrors() {
  return applyDecorators(
    ApiErrorEnvelope(401, 'UNAUTHORIZED', 'Token tidak ada / tidak valid'),
    ApiErrorEnvelope(403, 'FORBIDDEN', 'Role tidak diizinkan'),
  );
}

/** 404 untuk endpoint yang mengambil resource by id/param. */
export function ApiNotFound(resource = 'Resource') {
  return ApiErrorEnvelope(404, 'NOT_FOUND', `${resource} tidak ditemukan`);
}

/**
 * Envelope sukses `{ success, message, data, meta? }` untuk status HTTP yang
 * diberikan (default 200). Bila `model` diberikan, `data` di-ref ke schema
 * model itu (single atau array); tanpa model, `data` generik (object).
 * `meta` didokumentasikan untuk list/paginasi (snake_case, §2.B).
 */
export function ApiResponseWrapped(
  model?: Type<unknown>,
  description = 'Success',
  status = HttpStatus.OK,
) {
  const data = model
    ? {
        oneOf: [
          { $ref: getSchemaPath(model) },
          { type: 'array', items: { $ref: getSchemaPath(model) } },
        ],
        nullable: true,
      }
    : { type: 'object' as const, nullable: true };

  const schema = {
    type: 'object' as const,
    properties: {
      success: { type: 'boolean' as const, example: true },
      message: { type: 'string' as const, example: description },
      data,
      meta: {
        type: 'object' as const,
        properties: {
          page: { type: 'number' as const, example: 1 },
          limit: { type: 'number' as const, example: 10 },
          total_items: { type: 'number' as const, example: 0 },
          total_pages: { type: 'number' as const, example: 0 },
          has_next_page: { type: 'boolean' as const, example: false },
          has_prev_page: { type: 'boolean' as const, example: false },
        },
      },
    },
    required: ['success', 'message', 'data'],
  };

  return applyDecorators(
    ...(model ? [ApiExtraModels(model)] : []),
    ApiResponse({ status, description, schema }),
  );
}
