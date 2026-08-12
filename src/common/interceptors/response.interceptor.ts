import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';
import { PaginatedResult } from '../interfaces/paginated-result.interface';
import { BYPASS_TRANSFORM_KEY } from '../decorators/bypass-transform.decorator';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator';

function isApiResponse(value: unknown): value is ApiResponse {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.success === 'boolean' &&
    typeof candidate.message === 'string' &&
    'data' in candidate
  );
}

function isPaginatedResult<T>(value: unknown): value is PaginatedResult<T> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.data) &&
    typeof candidate.meta === 'object' &&
    candidate.meta !== null &&
    !Array.isArray(candidate.meta)
  );
}

/** Key internal DB yang wajib dibuang dari payload (§4.3). */
const INTERNAL_KEYS = new Set(['deletedAt']);

/** Normalisasi payload: Date → `YYYY-MM-DDTHH:mm:ssZ` + buang key internal DB. */
function sanitizePayload(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizePayload);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => !INTERNAL_KEYS.has(key))
        .map(([key, item]) => [key, sanitizePayload(item)]),
    );
  }
  return value;
}

/**
 * Envelope global `{ success, message, data, meta? }` (§2).
 * - `@BypassTransform()` → payload dilewatkan mentah (§5.3).
 * - `@ResponseMessage(msg)` → override `message` default 'Success'.
 * - Data `{ data, meta }` (paginasi) di-untangle: array di top-level `data`.
 * - `Date` dinormalisasi ke ISO 8601 UTC tanpa milidetik; key internal DB
 *   (`deletedAt`) dibuang dari payload (§4.1, §4.3).
 */
@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const bypass = this.reflector.getAllAndOverride<boolean>(
      BYPASS_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (bypass) {
      return next.handle();
    }

    const message =
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'Success';

    return next.handle().pipe(
      map((data) => {
        let payload: unknown;

        if (isApiResponse(data)) {
          payload = data;
        } else if (isPaginatedResult<T>(data)) {
          payload = {
            success: true,
            message,
            data: data.data,
            meta: data.meta,
          };
        } else {
          payload = {
            success: true,
            message,
            data: data ?? null,
          };
        }

        return sanitizePayload(payload) as ApiResponse<T> | T;
      }),
    );
  }
}
