import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { PolicyService } from '../policy/policy.service';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    manager: {
      findOne: jest.Mock;
      create: jest.Mock;
      save: jest.Mock;
      count: jest.Mock;
    };
  };
  let dataSource: { createQueryRunner: jest.Mock };
  let transactionRepository: {
    createQueryBuilder: jest.Mock;
    findAndCount: jest.Mock;
  };

  beforeEach(async () => {
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        create: jest.fn((_entity, data) => data),
        save: jest.fn((data) => Promise.resolve(data)),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    };

    transactionRepository = {
      createQueryBuilder: jest.fn(),
      findAndCount: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(Transaction),
          useValue: transactionRepository,
        },
        {
          provide: PolicyService,
          useValue: {
            getPolicy: jest.fn().mockResolvedValue({
              id: 1,
              fine_per_day: 5000,
              loan_duration_days: 7,
              max_books_per_user: 3,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionsService>(TransactionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('borrowBook', () => {
    it('meminjam buku AVAILABLE: set status BORROWED, commit, dan return dueDate', async () => {
      const bookItem = { id: 10, barcode: 'B001', status: 'AVAILABLE' };
      queryRunner.manager.findOne.mockResolvedValueOnce(bookItem);

      const result = await service.borrowBook('B001', 1);

      // Transaksi dibuka dengan benar
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();

      // Status buku berubah jadi BORROWED
      expect(bookItem.status).toBe('BORROWED');

      // Transaksi dibuat dengan status BORROWED dan user yang benar
      expect(queryRunner.manager.create).toHaveBeenCalledWith(
        Transaction,
        expect.objectContaining({
          user: { id: 1 },
          bookItem,
          status: 'BORROWED',
          due_date: expect.any(Date),
        }),
      );

      // Commit dipanggil, rollback tidak
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalledTimes(1);

      // Return message + dueDate
      expect(result.message).toBe('Buku berhasil dipinjam');
      expect(result.dueDate).toBeInstanceOf(Date);

      // dueDate default 7 hari ke depan
      const expected = new Date();
      expected.setDate(expected.getDate() + 7);
      expect(
        Math.abs(result.dueDate.getTime() - expected.getTime()),
      ).toBeLessThan(5000);
    });

    it('buku tidak ditemukan: NotFoundException dan rollback', async () => {
      queryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.borrowBook('NOPE', 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('buku status != AVAILABLE: BadRequestException dan rollback', async () => {
      queryRunner.manager.findOne.mockResolvedValueOnce({
        id: 10,
        barcode: 'B001',
        status: 'BORROWED',
      });

      await expect(service.borrowBook('B001', 1)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('menolak bila user sudah mencapai max_books_per_user', async () => {
      // policy.max_books_per_user = 3; simulasikan 3 pinjaman aktif
      queryRunner.manager.findOne.mockResolvedValueOnce({
        id: 10,
        barcode: 'B001',
        status: 'AVAILABLE',
      });
      queryRunner.manager.count.mockResolvedValueOnce(3);

      await expect(service.borrowBook('B001', 5)).rejects.toThrow(/maksimal/i);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('returnBook', () => {
    it('buku tidak ditemukan: NotFoundException dan rollback', async () => {
      queryRunner.manager.findOne.mockResolvedValueOnce(null);

      await expect(service.returnBook('NOPE')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('buku status != BORROWED: BadRequestException dan rollback', async () => {
      queryRunner.manager.findOne.mockResolvedValueOnce({
        id: 10,
        barcode: 'B001',
        status: 'AVAILABLE',
      });

      await expect(service.returnBook('B001')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('transaksi aktif tidak ada: NotFoundException dan rollback', async () => {
      queryRunner.manager.findOne
        .mockResolvedValueOnce({ id: 10, barcode: 'B001', status: 'BORROWED' })
        .mockResolvedValueOnce(null);

      await expect(service.returnBook('B001')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    });

    it('kembali tepat waktu: fine_amount 0 dan message "Tidak ada denda"', async () => {
      const bookItem = { id: 10, barcode: 'B001', status: 'BORROWED' };
      // due_date besok (belum lewat)
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      const transaction: any = { id: 5, due_date: dueDate };

      queryRunner.manager.findOne
        .mockResolvedValueOnce(bookItem)
        .mockResolvedValueOnce(transaction);

      const result = await service.returnBook('B001');

      expect(transaction.fine_amount).toBe(0);
      expect(transaction.status).toBe('RETURNED');
      expect(bookItem.status).toBe('AVAILABLE');
      expect(result.fine).toBe('Tidak ada denda');
      expect(result.message).toBe('Buku berhasil dikembalikan');
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
    });

    it('kembali telat 3 hari: denda 3 * 5000 = 15000', async () => {
      const bookItem = { id: 10, barcode: 'B001', status: 'BORROWED' };
      // due_date tepat 3 hari yang lalu
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 3);
      const transaction: any = { id: 5, due_date: dueDate };

      queryRunner.manager.findOne
        .mockResolvedValueOnce(bookItem)
        .mockResolvedValueOnce(transaction);

      const result = await service.returnBook('B001');

      expect(transaction.fine_amount).toBe(15000);
      expect(transaction.status).toBe('RETURNED');
      expect(bookItem.status).toBe('AVAILABLE');
      expect(result.fine).toBe('Denda Anda: Rp 15000');
      expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('telat beberapa jam di hari yang sama tidak dikenai denda (per hari kalender)', async () => {
      const bookItem = { id: 10, barcode: 'B001', status: 'BORROWED' };
      // due_date awal hari ini -> kembali hari ini juga = 0 hari kalender lewat
      const dueDate = new Date();
      dueDate.setHours(0, 0, 0, 0);
      const transaction: any = { id: 5, due_date: dueDate };

      queryRunner.manager.findOne
        .mockResolvedValueOnce(bookItem)
        .mockResolvedValueOnce(transaction);

      const result = await service.returnBook('B001');

      expect(transaction.fine_amount).toBe(0);
      expect(result.fine).toBe('Tidak ada denda');
    });

    it('telat tepat 1 hari kalender: denda 5000', async () => {
      const bookItem = { id: 10, barcode: 'B001', status: 'BORROWED' };
      // due_date awal kemarin -> kembali hari ini = 1 hari kalender lewat
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() - 1);
      dueDate.setHours(0, 0, 0, 0);
      const transaction: any = { id: 5, due_date: dueDate };

      queryRunner.manager.findOne
        .mockResolvedValueOnce(bookItem)
        .mockResolvedValueOnce(transaction);

      const result = await service.returnBook('B001');

      expect(transaction.fine_amount).toBe(5000);
      expect(result.fine).toBe('Denda Anda: Rp 5000');
    });

    it('set returned_at, simpan transaksi dan bookItem, commit', async () => {
      const bookItem = { id: 10, barcode: 'B001', status: 'BORROWED' };
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 1);
      const transaction: any = { id: 5, due_date: dueDate };

      queryRunner.manager.findOne
        .mockResolvedValueOnce(bookItem)
        .mockResolvedValueOnce(transaction);

      await service.returnBook('B001');

      expect(transaction.returned_at).toBeInstanceOf(Date);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(transaction);
      expect(queryRunner.manager.save).toHaveBeenCalledWith(bookItem);
      expect(queryRunner.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('mengembalikan data paginated dengan meta yang benar', async () => {
      const data = [{ id: 1 }, { id: 2 }];
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setFindOptions: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([data, 2]),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toBe(data);
      expect(result.meta).toEqual({
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
      expect(qb.where).not.toHaveBeenCalled();
    });

    it('menerapkan filter search bila diberikan', async () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        setFindOptions: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      transactionRepository.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ page: 1, limit: 10, search: 'foo' });

      expect(qb.where).toHaveBeenCalledWith(expect.any(String), {
        search: '%foo%',
      });
    });
  });

  describe('findByUser', () => {
    it('memfilter berdasarkan userId dan mengembalikan meta', async () => {
      transactionRepository.findAndCount.mockResolvedValue([[{ id: 1 }], 1]);

      const result = await service.findByUser(7, { page: 2, limit: 5 });

      expect(transactionRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { user: { id: 7 } },
          skip: 5,
          take: 5,
        }),
      );
      expect(result.meta).toEqual({
        total: 1,
        page: 2,
        limit: 5,
        totalPages: 1,
      });
    });
  });
});
