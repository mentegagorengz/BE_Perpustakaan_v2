import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { BookItem } from '../books/entities/book-item.entity';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { BookStatus, TransactionStatus } from '../../common/enums/book.enum';

@Injectable()
export class TransactionsService {
  constructor(
    private dataSource: DataSource,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async borrowBook(dto: BorrowBookDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Cek apakah buku ada dan tersedia
      // Tidak me-load relasi 'book' di sini: menggabungkan pessimistic_write
      // dengan relasi menghasilkan LEFT JOIN + FOR UPDATE yang ditolak
      // PostgreSQL ("FOR UPDATE cannot be applied to the nullable side of an
      // outer join"). Logika borrow hanya butuh kolom bookItem itu sendiri.
      const bookItem = await queryRunner.manager.findOne(BookItem, {
        where: { barcode: dto.barcode },
        lock: { mode: 'pessimistic_write' }, // Lock untuk mencegah race condition
      });

      if (!bookItem) throw new NotFoundException('Buku tidak ditemukan');
      if (bookItem.status !== BookStatus.AVAILABLE)
        throw new BadRequestException('Buku sedang tidak tersedia');

      // 2. Buat record transaksi
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // Default pinjam 7 hari

      const transaction = queryRunner.manager.create(Transaction, {
        user: { id: dto.user_id },
        bookItem: bookItem,
        due_date: dueDate,
        status: TransactionStatus.BORROWED,
      });

      // 3. Update status buku menjadi BORROWED
      bookItem.status = BookStatus.BORROWED;

      await queryRunner.manager.save(transaction);
      await queryRunner.manager.save(bookItem);

      await queryRunner.commitTransaction();
      return { message: 'Buku berhasil dipinjam', dueDate };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async returnBook(barcode: string) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Cari fisik buku berdasarkan barcode
      // Catatan: TANPA relations. `pessimistic_write` menghasilkan FOR UPDATE,
      // dan menggabungkannya dengan relasi (LEFT JOIN) ditolak PostgreSQL
      // ("FOR UPDATE cannot be applied to the nullable side of an outer join").
      // Relasi `book` juga tidak dipakai di alur ini.
      const bookItem = await queryRunner.manager.findOne(BookItem, {
        where: { barcode },
        lock: { mode: 'pessimistic_write' }, // Lock untuk mencegah race condition
      });

      if (!bookItem)
        throw new NotFoundException(
          'Buku dengan barcode tersebut tidak terdaftar',
        );
      if (bookItem.status !== BookStatus.BORROWED)
        throw new BadRequestException(
          'Buku ini sedang tidak dalam status dipinjam',
        );

      // 2. Cari transaksi yang aktif (yang belum dikembalikan)
      const transaction = await queryRunner.manager.findOne(Transaction, {
        where: {
          bookItem: { id: bookItem.id },
          returned_at: IsNull(),
        },
      });

      if (!transaction)
        throw new NotFoundException('Data transaksi aktif tidak ditemukan');

      // 3. Hitung denda jika terlambat
      const returnDate = new Date();
      let fineAmount = 0;
      const dailyFine = 5000; // Denda Rp 5.000 per hari

      // Denda dihitung per hari kalender: normalkan kedua tanggal ke awal hari
      // (strip jam-menit-detik) supaya keterlambatan beberapa jam di hari yang
      // sama dengan due_date tidak dikenai denda.
      const dueDay = new Date(transaction.due_date);
      dueDay.setHours(0, 0, 0, 0);
      const returnDay = new Date(returnDate);
      returnDay.setHours(0, 0, 0, 0);

      if (returnDay > dueDay) {
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.round(
          (returnDay.getTime() - dueDay.getTime()) / msPerDay,
        );
        fineAmount = diffDays * dailyFine;
      }

      // 4. Update data transaksi
      transaction.returned_at = returnDate;
      transaction.fine_amount = fineAmount;
      transaction.status = TransactionStatus.RETURNED;

      // 5. Update status fisik buku menjadi tersedia kembali
      bookItem.status = BookStatus.AVAILABLE;

      await queryRunner.manager.save(transaction);
      await queryRunner.manager.save(bookItem);

      await queryRunner.commitTransaction();

      return {
        message: 'Buku berhasil dikembalikan',
        fine:
          fineAmount > 0 ? `Denda Anda: Rp ${fineAmount}` : 'Tidak ada denda',
        returnedAt: returnDate,
      };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Transaction>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.user', 'user')
      .leftJoinAndSelect('transaction.bookItem', 'bookItem')
      .leftJoinAndSelect('bookItem.book', 'book')
      .orderBy('transaction.borrowed_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      queryBuilder.where(
        'book.title ILIKE :search OR user.full_name ILIKE :search OR bookItem.barcode ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByUser(
    userId: number,
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Transaction>> {
    const { page = 1, limit = 10 } = paginationDto;
    const skip = (page - 1) * limit;

    const [data, total] = await this.transactionRepository.findAndCount({
      where: { user: { id: userId } },
      relations: ['bookItem', 'bookItem.book'],
      order: { borrowed_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
