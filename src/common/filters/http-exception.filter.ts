import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponse, FieldError } from '../interfaces/api-response.interface';

const ERROR_CODES: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'INTERNAL_SERVER_ERROR',
};

interface ExceptionPayload {
  statusCode?: number;
  message?: unknown;
  error?: string;
}

function isFieldErrorArray(value: unknown): value is FieldError[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as FieldError).field === 'string' &&
        typeof (item as FieldError).message === 'string',
    )
  );
}

/**
 * Envelope error global sesuai API_STANDARDS.md §2.C:
 * `{ success: false, message, error: { code, details } }`.
 * - `details` berisi `{ field, message }[]` untuk error per-field (validasi)
 *   atau `null` untuk error global.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const payload: ExceptionPayload | null =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as ExceptionPayload)
        : null;

    const rawMessage =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (payload?.message ?? 'Internal server error');

    let message: string;
    let details: FieldError[] | null = null;

    if (typeof rawMessage === 'string') {
      message = rawMessage;
    } else if (isFieldErrorArray(rawMessage)) {
      details = rawMessage;
      message = 'Validasi gagal';
    } else if (Array.isArray(rawMessage)) {
      message = rawMessage.join(', ');
    } else {
      message = 'Internal server error';
    }

    const body: ApiResponse<null> = {
      success: false,
      message,
      error: {
        code: ERROR_CODES[status] ?? 'INTERNAL_SERVER_ERROR',
        details,
      },
    };

    response.status(status).json(body);
  }
}
