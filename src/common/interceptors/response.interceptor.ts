import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import type { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

interface RawErrorPayload {
  statusCode?: number;
  message?: unknown;
}

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        const statusCode = context
          .switchToHttp()
          .getResponse<Response>().statusCode;

        const raw = data as unknown as RawErrorPayload | null;
        if (data && raw?.statusCode && raw.message) {
          // Payload sudah berbentuk response ter-wrap (dikontrol handler).
          return data as unknown as ApiResponse<T>;
        }

        return {
          statusCode,
          message: 'Success',
          data,
        };
      }),
    );
  }
}
