import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Like } from 'typeorm';
import { LanguagesService } from './languages.service';
import { Language } from './entities/language.entity';

describe('LanguagesService', () => {
  let service: LanguagesService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguagesService,
        { provide: getRepositoryToken(Language), useValue: repo },
      ],
    }).compile();

    service = module.get<LanguagesService>(LanguagesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and persist a language, returning the saved entity', async () => {
      const dto = { name: 'English', code: 'en' };
      const entity = { id: 1, ...dto } as Language;
      repo.create.mockReturnValue(entity);
      repo.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(repo.create).toHaveBeenCalledWith(dto);
      expect(repo.save).toHaveBeenCalledWith(entity);
      expect(result).toBe(entity);
    });
  });

  describe('findAll', () => {
    it('should return paginated result with correct meta (snake_case, has_next_page/has_prev_page)', async () => {
      const data = [{ id: 1, name: 'A' }] as Language[];
      repo.findAndCount.mockResolvedValue([data, 25]);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        order: { name: 'ASC' },
      });
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

    it('should apply default pagination when page and limit are omitted', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAll({});

      expect(repo.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        order: { name: 'ASC' },
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 10,
        total_items: 0,
        total_pages: 0,
        has_next_page: false,
        has_prev_page: false,
      });
    });

    it('should filter by name using Like when search is provided', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'eng' });

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { name: Like('%eng%') } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return the language when found', async () => {
      const entity = { id: 1, name: 'A' } as Language;
      repo.findOne.mockResolvedValue(entity);

      const result = await service.findOne(1);

      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(entity);
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should merge changes and save when the language exists', async () => {
      const existing = { id: 1, name: 'Old', code: 'ol' } as Language;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((e) => Promise.resolve(e));

      const result = await service.update(1, { name: 'New' });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, name: 'New', code: 'ol' }),
      );
      expect(result.name).toBe('New');
    });

    it('should throw NotFoundException when the language does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update(99, { name: 'x' })).rejects.toThrow(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove the language when it exists', async () => {
      const existing = { id: 1, name: 'A' } as Language;
      repo.findOne.mockResolvedValue(existing);
      repo.remove.mockResolvedValue(existing);

      await service.remove(1);

      expect(repo.remove).toHaveBeenCalledWith(existing);
    });

    it('should throw NotFoundException when the language does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
