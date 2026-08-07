import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog } from './entities/activity-log.entity';
import { AUDIT_LOG_EVENT } from './audit-log.event';
import type { AuditLogEvent } from './audit-log.event';

@Injectable()
export class ActivityLogListener {
  private readonly logger = new Logger(ActivityLogListener.name);

  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @OnEvent(AUDIT_LOG_EVENT, { async: true })
  async handleAuditLogEvent(event: AuditLogEvent): Promise<void> {
    try {
      const payload: Partial<ActivityLog> = {
        action: event.action,
        module: event.module,
        details: event.details,
        status: event.status,
        ip_address: event.ipAddress,
        device_info: event.deviceInfo,
        user: event.userId
          ? ({ id: event.userId } as ActivityLog['user'])
          : undefined,
      };
      await this.activityLogsService.create(payload);
    } catch (error) {
      // Gagal menyimpan audit log TIDAK boleh menggagalkan HTTP request utama.
      this.logger.error('Failed to save audit log', error as Error);
    }
  }
}
