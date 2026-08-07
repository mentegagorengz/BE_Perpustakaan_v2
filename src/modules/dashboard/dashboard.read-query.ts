import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { ActivityLog } from '../activity-logs/entities/activity-log.entity';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';
import { TransactionStatus } from '../../common/enums/book.enum';

export interface DashboardTransactionStats {
  total_transactions: number;
  active_borrows: number;
  overdue_borrows: number;
  returned_transactions: number;
}

export interface DashboardSummary {
  total_books: number;
  total_users: number;
  total_logs: number;
  login_attempts: number;
  failed_actions: number;
  transactions: DashboardTransactionStats;
  server_status: string;
  last_updated: string;
}

/**
 * Dedicated read-query terisolasi untuk dashboard.
 *
 * Semua agregasi baca dikumpulkan di satu tempat agar mutasi dan query
 * statistik tidak bercampur. Dikonsumsi oleh DashboardService dengan
 * cache in-memory (TTL 60 detik).
 */
@Injectable()
export class DashboardReadQuery {
  constructor(
    @InjectRepository(Book) private readonly bookRepo: Repository<Book>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(ActivityLog)
    private readonly logRepo: Repository<ActivityLog>,
    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,
  ) {}

  countActiveBooks(): Promise<number> {
    return this.bookRepo.count({ where: { deletedAt: IsNull() } });
  }

  countActiveUsers(): Promise<number> {
    return this.userRepo.count({ where: { deletedAt: IsNull() } });
  }

  countLogs(): Promise<number> {
    return this.logRepo.count();
  }

  countLoginAttempts(): Promise<number> {
    return this.logRepo.count({ where: { action: 'LOGIN' } });
  }

  countFailedActions(): Promise<number> {
    return this.logRepo.count({ where: { status: 'FAILED' } });
  }

  async getTransactionStats(): Promise<DashboardTransactionStats> {
    const [total, active, overdue, returned] = await Promise.all([
      this.transactionRepo.count(),
      this.transactionRepo.count({
        where: { status: TransactionStatus.BORROWED },
      }),
      this.transactionRepo.count({
        where: { status: TransactionStatus.OVERDUE },
      }),
      this.transactionRepo.count({
        where: { status: TransactionStatus.RETURNED },
      }),
    ]);

    return {
      total_transactions: total,
      active_borrows: active,
      overdue_borrows: overdue,
      returned_transactions: returned,
    };
  }
}
