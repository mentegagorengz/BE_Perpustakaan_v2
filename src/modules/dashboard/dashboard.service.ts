import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { DashboardReadQuery } from './dashboard.read-query';
import type { DashboardSummary } from './dashboard.read-query';

export const DASHBOARD_SUMMARY_CACHE_KEY = 'dashboard:summary';
export const DASHBOARD_CACHE_TTL_MS = 60_000;

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly readQuery: DashboardReadQuery,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getSummary(): Promise<DashboardSummary> {
    const cached = await this.cacheManager.get<DashboardSummary>(
      DASHBOARD_SUMMARY_CACHE_KEY,
    );
    if (cached) return cached;

    const summary = await this.computeSummary();
    await this.cacheManager
      .set(DASHBOARD_SUMMARY_CACHE_KEY, summary, DASHBOARD_CACHE_TTL_MS)
      .catch((err: unknown) => {
        this.logger.warn(
          `dashboard cache write failed: ${
            err instanceof Error ? err.message : JSON.stringify(err)
          }`,
        );
      });

    return summary;
  }

  private async computeSummary(): Promise<DashboardSummary> {
    const [
      totalBooks,
      totalUsers,
      totalLogs,
      loginAttempts,
      failedActions,
      transactions,
    ] = await Promise.all([
      this.readQuery.countActiveBooks(),
      this.readQuery.countActiveUsers(),
      this.readQuery.countLogs(),
      this.readQuery.countLoginAttempts(),
      this.readQuery.countFailedActions(),
      this.readQuery.getTransactionStats(),
    ]);

    return {
      total_books: totalBooks,
      total_users: totalUsers,
      total_logs: totalLogs,
      login_attempts: loginAttempts,
      failed_actions: failedActions,
      transactions,
      server_status: 'ONLINE',
      last_updated: new Date().toISOString(),
    };
  }
}
