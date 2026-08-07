import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import {
  DashboardService,
  DASHBOARD_SUMMARY_CACHE_KEY,
  DASHBOARD_CACHE_TTL_MS,
} from './dashboard.service';
import { DashboardReadQuery } from './dashboard.read-query';

describe('DashboardService', () => {
  let service: DashboardService;
  let readQuery: {
    countActiveBooks: jest.Mock;
    countActiveUsers: jest.Mock;
    countLogs: jest.Mock;
    countLoginAttempts: jest.Mock;
    countFailedActions: jest.Mock;
    getTransactionStats: jest.Mock;
  };
  let cacheManager: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(async () => {
    readQuery = {
      countActiveBooks: jest.fn(),
      countActiveUsers: jest.fn(),
      countLogs: jest.fn(),
      countLoginAttempts: jest.fn(),
      countFailedActions: jest.fn(),
      getTransactionStats: jest.fn(),
    };
    cacheManager = { get: jest.fn(), set: jest.fn(), del: jest.fn() };
    cacheManager.set.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DashboardReadQuery, useValue: readQuery },
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  const seedQueries = () => {
    readQuery.countActiveBooks.mockResolvedValue(12);
    readQuery.countActiveUsers.mockResolvedValue(8);
    readQuery.countLogs.mockResolvedValue(100);
    readQuery.countLoginAttempts.mockResolvedValue(30);
    readQuery.countFailedActions.mockResolvedValue(5);
    readQuery.getTransactionStats.mockResolvedValue({
      total_transactions: 40,
      active_borrows: 6,
      overdue_borrows: 2,
      returned_transactions: 32,
    });
  };

  describe('getSummary', () => {
    it('returns the cached summary without re-running queries', async () => {
      const cached = { total_books: 1 } as never;
      cacheManager.get.mockResolvedValue(cached);

      const result = await service.getSummary();

      expect(result).toBe(cached);
      expect(readQuery.countActiveBooks).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('computes, caches with TTL 60s and returns the summary on cache miss', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      seedQueries();

      const result = await service.getSummary();

      expect(result).toMatchObject({
        total_books: 12,
        total_users: 8,
        total_logs: 100,
        login_attempts: 30,
        failed_actions: 5,
        transactions: {
          total_transactions: 40,
          active_borrows: 6,
          overdue_borrows: 2,
          returned_transactions: 32,
        },
        server_status: 'ONLINE',
      });
      expect(cacheManager.set).toHaveBeenCalledWith(
        DASHBOARD_SUMMARY_CACHE_KEY,
        result,
        DASHBOARD_CACHE_TTL_MS,
      );
    });

    it('still returns the summary when the cache write fails', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      cacheManager.set.mockRejectedValue(new Error('store down'));
      seedQueries();

      const result = await service.getSummary();

      expect(result.total_books).toBe(12);
    });

    it('includes a last_updated ISO timestamp string', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      seedQueries();

      const result = await service.getSummary();

      expect(typeof result.last_updated).toBe('string');
      expect(Number.isNaN(Date.parse(result.last_updated))).toBe(false);
    });
  });
});
