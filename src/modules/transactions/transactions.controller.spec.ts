import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';

describe('TransactionsController', () => {
  let controller: TransactionsController;
  let service: {
    borrowBook: jest.Mock;
    returnBook: jest.Mock;
    findAll: jest.Mock;
    findByUser: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      borrowBook: jest.fn(),
      returnBook: jest.fn(),
      findAll: jest.fn(),
      findByUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionsController],
      providers: [{ provide: TransactionsService, useValue: service }],
    }).compile();

    controller = module.get<TransactionsController>(TransactionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('borrow', () => {
    it('mendelegasikan ke borrowBook dengan user_id dari token', async () => {
      const expected = { message: 'Buku berhasil dipinjam' };
      service.borrowBook.mockResolvedValue(expected);

      const result = await controller.borrow({ barcode: 'B001' } as any, 42);

      expect(service.borrowBook).toHaveBeenCalledWith('B001', 42);
      expect(result).toBe(expected);
    });
  });

  describe('returnBook', () => {
    it('mendelegasikan ke returnBook dengan barcode dari param', async () => {
      const expected = { message: 'Buku berhasil dikembalikan' };
      service.returnBook.mockResolvedValue(expected);

      const result = await controller.returnBook('B001');

      expect(service.returnBook).toHaveBeenCalledWith('B001');
      expect(result).toBe(expected);
    });
  });

  describe('findAll', () => {
    it('mendelegasikan ke findAll dengan pagination dto', async () => {
      const dto = { page: 1, limit: 10 };
      const expected = { data: [], meta: {} };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(dto);

      expect(service.findAll).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('myHistory', () => {
    it('mendelegasikan ke findByUser dengan userId dan pagination dto', async () => {
      const dto = { page: 1, limit: 10 };
      const expected = { data: [], meta: {} };
      service.findByUser.mockResolvedValue(expected);

      const result = await controller.myHistory(7, dto);

      expect(service.findByUser).toHaveBeenCalledWith(7, dto);
      expect(result).toBe(expected);
    });
  });
});
