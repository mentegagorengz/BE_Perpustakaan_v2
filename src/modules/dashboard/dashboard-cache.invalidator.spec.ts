import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { DashboardCacheInvalidator } from './dashboard-cache.invalidator';
import { AUDIT_LOG_EVENT } from '../activity-logs/audit-log.event';
import { DASHBOARD_SUMMARY_CACHE_KEY } from './dashboard.service';

describe('DashboardCacheInvalidator', () => {
  let invalidator: DashboardCacheInvalidator;
  let cacheManager: { del: jest.Mock };

  beforeEach(async () => {
    cacheManager = { del: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardCacheInvalidator,
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    invalidator = module.get<DashboardCacheInvalidator>(
      DashboardCacheInvalidator,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('subscribes to the audit log event', () => {
    const metadata = Reflect.getMetadata(
      'EVENT_LISTENER_METADATA',
      invalidator.invalidateOnMutation,
    ) as { event: string }[];
    expect(metadata).toBeDefined();
    expect(metadata[0].event).toBe(AUDIT_LOG_EVENT);
  });

  it('clears the dashboard summary cache on any audit event', async () => {
    cacheManager.del.mockResolvedValue(undefined);

    await invalidator.invalidateOnMutation({} as never);

    expect(cacheManager.del).toHaveBeenCalledWith(DASHBOARD_SUMMARY_CACHE_KEY);
  });
});
