import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { Book } from '../books/entities/book.entity';
import { ActivityLog } from '../activity-logs/entities/activity-log.entity';
import { User } from '../users/entities/user.entity';

describe('DashboardService', () => {
  let service: DashboardService;
  let bookRepo: { count: jest.Mock };
  let logRepo: { count: jest.Mock };
  let userRepo: { count: jest.Mock };

  beforeEach(async () => {
    bookRepo = { count: jest.fn() };
    logRepo = { count: jest.fn() };
    userRepo = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: getRepositoryToken(Book), useValue: bookRepo },
        { provide: getRepositoryToken(ActivityLog), useValue: logRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    beforeEach(() => {
      bookRepo.count.mockResolvedValue(12);
      userRepo.count.mockResolvedValue(8);
      // logRepo.count is called three times: total logs, login attempts, failed actions
      logRepo.count
        .mockResolvedValueOnce(100) // total logs
        .mockResolvedValueOnce(30) // login attempts (where action = LOGIN)
        .mockResolvedValueOnce(5); // failed actions (where status = FAILED)
    });

    it('aggregates the counts from every repository into the summary payload', async () => {
      const result = await service.getSummary();

      expect(result).toMatchObject({
        total_books: 12,
        total_users: 8,
        total_logs: 100,
        login_attempts: 30,
        failed_actions: 5,
        server_status: 'ONLINE',
      });
    });

    it('queries each repository with the expected filters', async () => {
      await service.getSummary();

      expect(bookRepo.count).toHaveBeenCalledTimes(1);
      expect(userRepo.count).toHaveBeenCalledTimes(1);
      expect(logRepo.count).toHaveBeenCalledTimes(3);
      expect(logRepo.count).toHaveBeenNthCalledWith(1);
      expect(logRepo.count).toHaveBeenCalledWith({
        where: { action: 'LOGIN' },
      });
      expect(logRepo.count).toHaveBeenCalledWith({
        where: { status: 'FAILED' },
      });
    });

    it('reports the server status as ONLINE', async () => {
      const result = await service.getSummary();

      expect(result.server_status).toBe('ONLINE');
    });

    it('includes a last_updated ISO timestamp string', async () => {
      const result = await service.getSummary();

      expect(typeof result.last_updated).toBe('string');
      expect(Number.isNaN(Date.parse(result.last_updated))).toBe(false);
    });
  });
});
