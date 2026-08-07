import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Request } from 'express';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import {
  AUDIT_LOG_EVENT,
  AuditLogEvent,
  AuditStatus,
  determineAuditAction,
} from '../../modules/activity-logs/audit-log.event';

/**
 * Interceptor audit log event-driven.
 *
 * Interceptor hanya mengklasifikasikan aksi dan menge-mit event `audit.log`.
 * Penyimpanan ke database dilakukan secara asinkron oleh ActivityLogListener
 * sehingga request HTTP tidak menunggu penulisan log dan kegagalan persisten
 * tidak memengaruhi response utama.
 */
@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();

    return next.handle().pipe(
      tap(() => this.emitAudit(request, 'SUCCESS')),
      catchError((err: unknown) => {
        this.emitAudit(request, 'FAILED');
        return throwError(() => err);
      }),
    );
  }

  private emitAudit(request: Request, status: AuditStatus): void {
    const { method, url } = request;
    const action = determineAuditAction(method, url);

    if (action === 'ACCESS_PAGE') return;

    const user = request.user as
      | { id?: number; full_name?: string }
      | undefined;
    const event: AuditLogEvent = {
      action,
      status,
      module: url.split('/')[3]?.toUpperCase() || 'SYSTEM',
      details: `${user?.full_name ?? 'Guest'} performed ${action} on ${url}`,
      ipAddress: request.ip,
      deviceInfo: request.headers['user-agent'],
      userId: user?.id,
    };

    // Non-blocking: listener async menangani persistensi secara terisolasi.
    this.eventEmitter.emit(AUDIT_LOG_EVENT, event);
  }
}
