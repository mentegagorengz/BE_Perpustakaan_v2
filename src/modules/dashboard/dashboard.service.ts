import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Book } from '../books/entities/book.entity';
import { ActivityLog } from '../activity-logs/entities/activity-log.entity';
import { User } from '../users/entities/user.entity';
// Import entity transaksi peminjaman kamu di sini (misal: Borrowing)

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Book) private bookRepo: Repository<Book>,
    @InjectRepository(ActivityLog) private logRepo: Repository<ActivityLog>,
    @InjectRepository(User) private userRepo: Repository<User>,
    // @InjectRepository(Borrowing) private borrowRepo: Repository<Borrowing>,
  ) {}

  async getSummary() {
    const [totalBooks, totalUsers, totalLogs, loginAttempts] =
      await Promise.all([
        this.bookRepo.count(),
        this.userRepo.count(),
        this.logRepo.count(),
        this.logRepo.count({ where: { action: 'LOGIN' } }),
      ]);

    // Kita hitung juga aksi yang gagal untuk stat "Failed Actions" di UI kamu
    const failedActions = await this.logRepo.count({
      where: { status: 'FAILED' },
    });

    return {
      total_books: totalBooks,
      total_users: totalUsers,
      total_logs: totalLogs,
      login_attempts: loginAttempts,
      failed_actions: failedActions,
      server_status: 'ONLINE',
      last_updated: new Date().toISOString(),
    };
  }
}
