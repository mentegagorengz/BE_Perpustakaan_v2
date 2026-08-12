import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { In } from 'typeorm';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { BookItem } from './entities/book-item.entity';
import { Author } from '../authors/entities/author.entity';
import { Category } from '../categories/entities/category.entity';
import { Publisher } from '../publishers/entities/publisher.entity';
import { Language } from '../languages/entities/language.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { DataSource } from 'typeorm';
describe('BooksService', () => {
  let service: BooksService;
  let bookRepo: {
    create: jest.Mock;
    save: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    remove: jest.Mock;
    softDelete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let bookItemRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    softDelete: jest.Mock;
  };
  let authorRepo: {
    findBy: jest.Mock;
  };
  let categoryRepo: { findBy: jest.Mock };
  let publisherRepo: { findBy: jest.Mock };
  let languageRepo: { findBy: jest.Mock };
  let dataSource: { transaction: jest.Mock };
  let queryBuilder: {
    leftJoinAndSelect: jest.Mock;
    orderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    where: jest.Mock;
    getManyAndCount: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    };

    bookRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      remove: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };

    bookItemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      softDelete: jest.fn(),
    };

    authorRepo = {
      findBy: jest.fn(),
    };
    categoryRepo = { findBy: jest.fn() };
    publisherRepo = { findBy: jest.fn() };
    languageRepo = { findBy: jest.fn() };
    const manager = {
      create: jest.fn((entity: unknown, val: unknown) => val),
      save: jest.fn(async (book: unknown) => book),
    };
    dataSource = {
      transaction: jest.fn(
        async (cb: (m: typeof manager) => Promise<unknown>) => cb(manager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: getRepositoryToken(Book), useValue: bookRepo },
        { provide: getRepositoryToken(BookItem), useValue: bookItemRepo },
        { provide: getRepositoryToken(Author), useValue: authorRepo },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(Publisher), useValue: publisherRepo },
        { provide: getRepositoryToken(Language), useValue: languageRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateBookDto = {
      title: 'Clean Code',
      category_id: 5,
      publisher_id: 6,
      language_id: 7,
      author_ids: [1, 2],
    };

    it('looks up the authors by the provided ids', async () => {
      authorRepo.findBy.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      bookRepo.create.mockReturnValue({});
      bookRepo.save.mockResolvedValue({});

      await service.create(dto);

      expect(authorRepo.findBy).toHaveBeenCalledWith({ id: In([1, 2]) });
    });

    it('throws NotFoundException when some authors are missing', async () => {
      authorRepo.findBy.mockResolvedValue([{ id: 1 }]);

      await expect(service.create(dto)).rejects.toThrow(
        new NotFoundException('One or more authors not found'),
      );
      expect(bookRepo.create).not.toHaveBeenCalled();
      expect(bookRepo.save).not.toHaveBeenCalled();
    });

    it('builds the book with category, publisher, language and author relations then saves it', async () => {
      const authors = [{ id: 1 }, { id: 2 }];
      const built = { id: 10, title: 'Clean Code' };
      const saved = { ...built, persisted: true };
      authorRepo.findBy.mockResolvedValue(authors);
      bookRepo.create.mockReturnValue(built);
      bookRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto);

      expect(bookRepo.create).toHaveBeenCalledWith({
        title: 'Clean Code',
        category: { id: 5 },
        publisher: { id: 6 },
        language: { id: 7 },
        authors,
      });
      expect(bookRepo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(saved);
    });
  });

  describe('createMany', () => {
    const dtos: CreateBookDto[] = [
      {
        title: 'A',
        category_id: 1,
        publisher_id: 1,
        language_id: 1,
        author_ids: [1, 2],
      },
      {
        title: 'B',
        category_id: 1,
        publisher_id: 2,
        language_id: 1,
        author_ids: [2],
      },
    ];

    it('menyimpan seluruh buku relasi + join dalam satu transaksi setelah batch validation', async () => {
      categoryRepo.findBy.mockResolvedValue([{ id: 1 }]);
      publisherRepo.findBy.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      languageRepo.findBy.mockResolvedValue([{ id: 1 }]);
      authorRepo.findBy.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await service.createMany(dtos);

      expect(categoryRepo.findBy).toHaveBeenCalledWith({ id: In([1]) });
      expect(publisherRepo.findBy).toHaveBeenCalledWith({ id: In([1, 2]) });
      expect(authorRepo.findBy).toHaveBeenCalledWith({ id: In([1, 2]) });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
    });

    it('tidak memanggil query per-barang (anti N+1): 1 query per tabel relasi', async () => {
      categoryRepo.findBy.mockResolvedValue([{ id: 1 }]);
      publisherRepo.findBy.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      languageRepo.findBy.mockResolvedValue([{ id: 1 }]);
      authorRepo.findBy.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await service.createMany(dtos);

      expect(categoryRepo.findBy).toHaveBeenCalledTimes(1);
      expect(publisherRepo.findBy).toHaveBeenCalledTimes(1);
      expect(languageRepo.findBy).toHaveBeenCalledTimes(1);
      expect(authorRepo.findBy).toHaveBeenCalledTimes(1);
    });

    it('rollback atomic: relasi hilang → BadRequestException, transaksi TIDAK dijalankan', async () => {
      categoryRepo.findBy.mockResolvedValue([{ id: 999 }]);

      await expect(service.createMany(dtos)).rejects.toThrow(
        BadRequestException,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('mengembalikan array kosong bila payload kosong', async () => {
      const result = await service.createMany([]);

      expect(result).toEqual([]);
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns paginated data with computed meta', async () => {
      const data = [{ id: 1 }, { id: 2 }];
      queryBuilder.getManyAndCount.mockResolvedValue([data, 25]);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(bookRepo.createQueryBuilder).toHaveBeenCalledWith('book');
      expect(queryBuilder.skip).toHaveBeenCalledWith(10);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(result).toEqual({
        data,
        meta: {
          page: 2,
          limit: 10,
          total_items: 25,
          total_pages: 3,
          has_next_page: true,
          has_prev_page: true,
        },
      });
    });

    it('defaults to page 1 and limit 10 when not provided', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({});

      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
      expect(queryBuilder.take).toHaveBeenCalledWith(10);
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total_items: 0,
        total_pages: 0,
        has_next_page: false,
        has_prev_page: false,
      });
    });

    it('applies a search filter across title, isbn and author when search is present', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'code' });

      expect(queryBuilder.where).toHaveBeenCalledWith(
        'book.title ILIKE :search OR book.isbn_13 ILIKE :search OR author.name ILIKE :search',
        { search: '%code%' },
      );
    });

    it('does not apply a search filter when search is absent', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(queryBuilder.where).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns the book with its relations when found', async () => {
      const book = { id: 3 };
      bookRepo.findOne.mockResolvedValue(book);

      const result = await service.findOne(3);

      expect(bookRepo.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: ['category', 'authors', 'publisher', 'language', 'items'],
      });
      expect(result).toBe(book);
    });

    it('throws NotFoundException when the book does not exist', async () => {
      bookRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('Book with ID 99 not found'),
      );
    });
  });

  describe('update', () => {
    it('merges scalar fields onto the existing book and saves it', async () => {
      const existing = { id: 4, title: 'Old', description: 'old' };
      bookRepo.findOne.mockResolvedValue(existing);
      bookRepo.save.mockImplementation((b) => Promise.resolve(b));

      const result = await service.update(4, { title: 'New' });

      expect(bookRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 4, title: 'New', description: 'old' }),
      );
      expect(result).toEqual(expect.objectContaining({ id: 4, title: 'New' }));
    });

    it('sets category, publisher and language relations when their ids are provided', async () => {
      bookRepo.findOne.mockResolvedValue({ id: 4 });
      bookRepo.save.mockImplementation((b) => Promise.resolve(b));

      await service.update(4, {
        category_id: 11,
        publisher_id: 12,
        language_id: 13,
      });

      expect(bookRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          category: { id: 11 },
          publisher: { id: 12 },
          language: { id: 13 },
        }),
      );
    });

    it('replaces authors when valid author_ids are provided', async () => {
      const authors = [{ id: 1 }, { id: 2 }];
      bookRepo.findOne.mockResolvedValue({ id: 4 });
      authorRepo.findBy.mockResolvedValue(authors);
      bookRepo.save.mockImplementation((b) => Promise.resolve(b));

      await service.update(4, { author_ids: [1, 2] });

      expect(authorRepo.findBy).toHaveBeenCalledWith({ id: In([1, 2]) });
      expect(bookRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ authors }),
      );
    });

    it('throws NotFoundException when some updated authors are missing', async () => {
      bookRepo.findOne.mockResolvedValue({ id: 4 });
      authorRepo.findBy.mockResolvedValue([{ id: 1 }]);

      await expect(service.update(4, { author_ids: [1, 2] })).rejects.toThrow(
        new NotFoundException('One or more authors not found'),
      );
      expect(bookRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when updating a missing book', async () => {
      bookRepo.findOne.mockResolvedValue(null);

      await expect(service.update(99, { title: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(bookRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('soft-deletes the book and its items it exists', async () => {
      const existing = { id: 6 };
      bookRepo.findOne.mockResolvedValue(existing);
      bookRepo.softDelete.mockResolvedValue({ affected: 1 } as never);
      bookItemRepo.softDelete.mockResolvedValue({ affected: 1 } as never);

      await service.remove(6);

      expect(bookItemRepo.softDelete).toHaveBeenCalledWith({
        book: { id: 6 },
      });
      expect(bookRepo.softDelete).toHaveBeenCalledWith(6);
    });

    it('throws NotFoundException when removing a missing book', async () => {
      bookRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(bookRepo.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('createItem', () => {
    it('throws NotFoundException when the parent book does not exist', async () => {
      bookRepo.findOneBy.mockResolvedValue(null);

      await expect(
        service.createItem({ barcode: 'BRC-001', book_id: 3 }),
      ).rejects.toThrow(new NotFoundException('Book with ID 3 not found'));
      expect(bookItemRepo.create).not.toHaveBeenCalled();
    });

    it('creates the item linked to its parent book and saves it', async () => {
      const book = { id: 3 };
      const built = { id: 100, barcode: 'BRC-001' };
      const saved = { ...built, persisted: true };
      bookRepo.findOneBy.mockResolvedValue(book);
      bookItemRepo.create.mockReturnValue(built);
      bookItemRepo.save.mockResolvedValue(saved);

      const result = await service.createItem({
        barcode: 'BRC-001',
        book_id: 3,
      });

      expect(bookRepo.findOneBy).toHaveBeenCalledWith({ id: 3 });
      expect(bookItemRepo.create).toHaveBeenCalledWith({
        barcode: 'BRC-001',
        book,
      });
      expect(bookItemRepo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(saved);
    });
  });

  describe('findAllItems', () => {
    it('returns the items belonging to the given book', async () => {
      const items = [{ id: 1 }, { id: 2 }];
      bookItemRepo.find.mockResolvedValue(items);

      const result = await service.findAllItems(3);

      expect(bookItemRepo.find).toHaveBeenCalledWith({
        where: { book: { id: 3 } },
        relations: ['book'],
      });
      expect(result).toBe(items);
    });
  });
});
