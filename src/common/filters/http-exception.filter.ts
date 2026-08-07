import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

interface ExceptionPayload {
  statusCode?: number;
  message?: unknown;
  error?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const payload: ExceptionPayload | null =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as ExceptionPayload)
        : null;

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (payload?.message ?? 'Internal server error');

    response.status(status).json({
      statusCode: status,
      message,
      error: payload?.error,
      timestamp: new Date().toISOString(),
    });
  }
}
