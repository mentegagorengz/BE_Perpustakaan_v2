import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardReadQuery } from './dashboard.read-query';
import { DashboardCacheInvalidator } from './dashboard-cache.invalidator';
import { DashboardController } from './dashboard.controller';
import { Book } from '../books/entities/book.entity';
import { ActivityLog } from '../activity-logs/entities/activity-log.entity';
import { User } from '../users/entities/user.entity';
import { Transaction } from '../transactions/entities/transaction.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book, ActivityLog, User, Transaction])],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardReadQuery, DashboardCacheInvalidator],
})
export class DashboardModule {}
