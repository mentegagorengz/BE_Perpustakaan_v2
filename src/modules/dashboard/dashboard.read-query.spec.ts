import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { DashboardReadQuery } from './dashboard.read-query';
import { Book } from '../books/entities/book.entity';
import { User } from '../users/entities/user.entity';
import { ActivityLog } from '../activity-logs/entities/activity-log.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionStatus } from '../../common/enums/book.enum';

type MockRepo = {
  count: jest.Mock;
};

describe('DashboardReadQuery', () => {
  let readQuery: DashboardReadQuery;
  let bookRepo: MockRepo;
  let userRepo: MockRepo;
  let logRepo: MockRepo;
  let transactionRepo: MockRepo;

  beforeEach(async () => {
    bookRepo = { count: jest.fn() };
    userRepo = { count: jest.fn() };
    logRepo = { count: jest.fn() };
    transactionRepo = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardReadQuery,
        { provide: getRepositoryToken(Book), useValue: bookRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(ActivityLog), useValue: logRepo },
        { provide: getRepositoryToken(Transaction), useValue: transactionRepo },
      ],
    }).compile();

    readQuery = module.get<DashboardReadQuery>(DashboardReadQuery);
  });

  afterEach(() => jest.clearAllMocks());

  it('counts only non-deleted books and users', async () => {
    bookRepo.count.mockResolvedValue(10);
    userRepo.count.mockResolvedValue(4);

    await expect(readQuery.countActiveBooks()).resolves.toBe(10);
    await expect(readQuery.countActiveUsers()).resolves.toBe(4);
    expect(bookRepo.count).toHaveBeenCalledWith({
      where: { deletedAt: IsNull() },
    });
    expect(userRepo.count).toHaveBeenCalledWith({
      where: { deletedAt: IsNull() },
    });
  });

  it('counts logs, login attempts and failed actions', async () => {
    logRepo.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(5);

    await expect(readQuery.countLogs()).resolves.toBe(100);
    await expect(readQuery.countLoginAttempts()).resolves.toBe(30);
    await expect(readQuery.countFailedActions()).resolves.toBe(5);
    expect(logRepo.count).toHaveBeenCalledWith({ where: { action: 'LOGIN' } });
    expect(logRepo.count).toHaveBeenCalledWith({
      where: { status: 'FAILED' },
    });
  });

  it('aggregates transaction stats by status in one parallel batch', async () => {
    transactionRepo.count
      .mockResolvedValueOnce(40) // total
      .mockResolvedValueOnce(6) // BORROWED
      .mockResolvedValueOnce(2) // OVERDUE
      .mockResolvedValueOnce(32); // RETURNED

    const result = await readQuery.getTransactionStats();

    expect(result).toEqual({
      total_transactions: 40,
      active_borrows: 6,
      overdue_borrows: 2,
      returned_transactions: 32,
    });
    expect(transactionRepo.count).toHaveBeenCalledWith({
      where: { status: TransactionStatus.BORROWED },
    });
    expect(transactionRepo.count).toHaveBeenCalledWith({
      where: { status: TransactionStatus.OVERDUE },
    });
    expect(transactionRepo.count).toHaveBeenCalledWith({
      where: { status: TransactionStatus.RETURNED },
    });
  });
});
