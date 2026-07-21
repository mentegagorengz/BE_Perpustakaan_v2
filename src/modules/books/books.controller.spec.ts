import { Test, TestingModule } from '@nestjs/testing';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

describe('BooksController', () => {
  let controller: BooksController;
  let service: {
    create: jest.Mock;
    createMany: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    createItem: jest.Mock;
    findAllItems: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      createMany: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createItem: jest.fn(),
      findAllItems: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BooksController],
      providers: [{ provide: BooksService, useValue: service }],
    }).compile();

    controller = module.get<BooksController>(BooksController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('mendelegasikan ke service.create dengan dto', async () => {
      const dto = { title: 'Clean Code' } as any;
      const expected = { id: 1 };
      service.create.mockResolvedValue(expected);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('findAll', () => {
    it('mendelegasikan ke service.findAll dengan pagination dto', async () => {
      const dto = { page: 1, limit: 10 };
      const expected = { data: [], meta: {} };
      service.findAll.mockResolvedValue(expected);

      const result = await controller.findAll(dto);

      expect(service.findAll).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('findOne', () => {
    it('mendelegasikan ke service.findOne dengan id numerik dari param string', async () => {
      const expected = { id: 5 };
      service.findOne.mockResolvedValue(expected);

      const result = await controller.findOne('5');

      expect(service.findOne).toHaveBeenCalledWith(5);
      expect(result).toBe(expected);
    });
  });

  describe('update', () => {
    it('mendelegasikan ke service.update dengan id numerik dan dto', async () => {
      const dto = { title: 'New' } as any;
      const expected = { id: 5, title: 'New' };
      service.update.mockResolvedValue(expected);

      const result = await controller.update('5', dto);

      expect(service.update).toHaveBeenCalledWith(5, dto);
      expect(result).toBe(expected);
    });
  });

  describe('remove', () => {
    it('mendelegasikan ke service.remove dengan id numerik', async () => {
      service.remove.mockResolvedValue(undefined);

      await controller.remove('5');

      expect(service.remove).toHaveBeenCalledWith(5);
    });
  });

  describe('createItem', () => {
    it('mendelegasikan ke service.createItem dengan dto', async () => {
      const dto = { barcode: 'BRC-001', book_id: 1 } as any;
      const expected = { id: 100 };
      service.createItem.mockResolvedValue(expected);

      const result = await controller.createItem(dto);

      expect(service.createItem).toHaveBeenCalledWith(dto);
      expect(result).toBe(expected);
    });
  });

  describe('findAllItems', () => {
    it('mendelegasikan ke service.findAllItems dengan id numerik dari param', async () => {
      const expected = [{ id: 1 }];
      service.findAllItems.mockResolvedValue(expected);

      const result = await controller.findAllItems('5');

      expect(service.findAllItems).toHaveBeenCalledWith(5);
      expect(result).toBe(expected);
    });
  });

  describe('createMany', () => {
    it('mendelegasikan ke service.createMany dengan array buku', async () => {
      const dtos = [{ title: 'A' }, { title: 'B' }];
      const expected = [{ id: 1 }, { id: 2 }];
      service.createMany.mockResolvedValue(expected);

      const result = await controller.createMany(dtos);

      expect(service.createMany).toHaveBeenCalledWith(dtos);
      expect(result).toBe(expected);
    });
  });
});
