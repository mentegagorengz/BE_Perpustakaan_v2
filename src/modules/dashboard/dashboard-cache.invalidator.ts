import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Cache } from 'cache-manager';
import { AUDIT_LOG_EVENT } from '../activity-logs/audit-log.event';
import type { AuditLogEvent } from '../activity-logs/audit-log.event';
import { DASHBOARD_SUMMARY_CACHE_KEY } from './dashboard.service';

/**
 * Invalidasi cache dashboard setelah mutasi statistik.
 *
 * Setiap event audit (create/update/delete/login yang berhasil atau gagal)
 * mengubah salah satu angka pada summary, jadi cache dihapus pada tiap event.
 * READ queries tidak menambah nilai di sini karena interceptor tidak
 * meng-emit akses baca (ACCESS_PAGE di-skip di ActivityLogInterceptor).
 */
@Injectable()
export class DashboardCacheInvalidator {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  @OnEvent(AUDIT_LOG_EVENT)
  async invalidateOnMutation(event: AuditLogEvent): Promise<void> {
    void event;
    await this.cacheManager.del(DASHBOARD_SUMMARY_CACHE_KEY);
  }
}
