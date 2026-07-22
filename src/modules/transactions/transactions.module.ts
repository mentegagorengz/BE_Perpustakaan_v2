import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction } from './entities/transaction.entity';
import { BookItem } from '../books/entities/book-item.entity';
import { PolicyModule } from '../policy/policy.module';

@Module({
  imports: [TypeOrmModule.forFeature([Transaction, BookItem]), PolicyModule], // Tambahkan BookItem di sini
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}
