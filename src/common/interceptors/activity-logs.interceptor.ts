import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { ActivityLogsService } from '../../modules/activity-logs/activity-logs.service';

@Injectable()
export class ActivityLogInterceptor implements NestInterceptor {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const ip =
      request.headers['x-forwarded-for'] ||
      request.ip ||
      request.connection?.remoteAddress;
    const device = request.headers['user-agent'];

    return next.handle().pipe(
      tap(() => this.logAction(request, 'SUCCESS', url, method, device, ip)),
      catchError((err) => {
        this.logAction(request, 'FAILED', url, method, device, ip);
        return throwError(() => err);
      }),
    );
  }

  private async logAction(
    request: any,
    status: 'SUCCESS' | 'FAILED',
    url: string,
    method: string,
    device: string,
    ip: string,
  ) {
    const user = request.user;
    const action = url.includes('auth/login')
      ? 'LOGIN'
      : method === 'POST'
        ? 'CREATE'
        : ['PATCH', 'PUT'].includes(method)
          ? 'UPDATE'
          : method === 'DELETE'
            ? 'DELETE'
            : 'ACCESS_PAGE';

    if (['CREATE', 'UPDATE', 'DELETE', 'LOGIN'].includes(action)) {
      await this.activityLogsService.create({
        action,
        module: url.split('/')[3]?.toUpperCase() || 'SYSTEM',
        details: `${user?.full_name || 'Guest'} performed ${action} on ${url}`,
        status,
        ip_address: Array.isArray(ip) ? ip[0] : ip,
        device_info: device,
        user: user || null,
      });
    }
  }
}
