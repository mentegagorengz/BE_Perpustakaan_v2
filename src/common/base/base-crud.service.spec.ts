import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { Like, Repository } from 'typeorm';
import { BaseCrudService } from './base-crud.service';
import { PaginationDto } from '../dto/pagination.dto';

interface TestEntity {
  id: number;
  name: string;
  extra?: string;
}

type CreateDto = { name: string };
type UpdateDto = Partial<CreateDto>;

describe('BaseCrudService', () => {
  let service: BaseCrudService<TestEntity, CreateDto, UpdateDto>;
  let repo: jest.Mocked<
    Pick<
      Repository<TestEntity>,
      'create' | 'save' | 'findAndCount' | 'findOne' | 'remove'
    >
  >;

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
        {
          provide: BaseCrudService,
          useFactory: () =>
            new BaseCrudService<TestEntity, CreateDto, UpdateDto>(
              repo as unknown as Repository<TestEntity>,
              {
                entityName: 'TestEntity',
                searchColumn: 'name',
                orderColumn: 'name',
              },
            ),
        },
      ],
    }).compile();

    service =
      module.get<BaseCrudService<TestEntity, CreateDto, UpdateDto>>(
        BaseCrudService,
      );
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('membuat entity via repository.create + save', async () => {
      const built = { id: 1, name: 'X' } as TestEntity;
      repo.create.mockReturnValue(built as never);
      repo.save.mockResolvedValue(built);

      const result = await service.create({ name: 'X' });

      expect(repo.create).toHaveBeenCalledWith({ name: 'X' });
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(built);
    });
  });

  describe('findAll', () => {
    const buildMeta = (total: number, page: number, limit: number) => ({
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });

    it('pagination default page 1 & limit 10, tanpa search → where kosong', async () => {
      const rows = [{ id: 1, name: 'A' }] as TestEntity[];
      repo.findAndCount.mockResolvedValue([rows, 1]);

      const result = await service.findAll({});

      expect(repo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          skip: 0,
          take: 10,
          order: { name: 'ASC' },
        }),
      );
      expect(result).toEqual({
        data: rows,
        meta: buildMeta(1, 1, 10),
      });
    });

    it('search memakai LIKE pada kolom konfigurasi', async () => {
      repo.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ search: 'martin' } as PaginationDto);

      const args = repo.findAndCount.mock.calls[0][0];
      expect(args).toHaveProperty('where.name');
      expect((args.where as { name: unknown }).name).toEqual(Like('%martin%'));
    });

    it('menghitung totalPages = ceil(total/limit)', async () => {
      repo.findAndCount.mockResolvedValue([[], 25]);

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(result.meta).toEqual(buildMeta(25, 2, 10));
    });
  });

  describe('findOne', () => {
    it('mengembalikan entity bila ditemukan', async () => {
      const row = { id: 5, name: 'A' } as TestEntity;
      repo.findOne.mockResolvedValue(row);

      const result = await service.findOne(5);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: expect.objectContaining({ id: 5 }),
      });
      expect(result).toBe(row);
    });

    it('melempar NotFoundException dengan nama entity bila tidak ada', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toThrow(
        new NotFoundException('TestEntity with ID 99 not found'),
      );
    });
  });

  describe('update', () => {
    it('menggabungkan payload ke entity lalu save', async () => {
      const existing = { id: 3, name: 'Old' } as TestEntity;
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockImplementation((entity) =>
        Promise.resolve(entity as TestEntity),
      );

      const result = await service.update(3, { name: 'New' });

      expect(existing.name).toBe('New');
      expect(repo.save).toHaveBeenCalledWith(existing);
      expect(result).toBe(existing);
    });

    it('melempar NotFoundException bila entity tidak ada', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update(9, { name: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('menghapus entity yang ada', async () => {
      const existing = { id: 7, name: 'A' } as TestEntity;
      repo.findOne.mockResolvedValue(existing);
      repo.remove.mockResolvedValue(existing);

      await service.remove(7);

      expect(repo.remove).toHaveBeenCalledWith(existing);
    });

    it('melempar NotFoundException bila entity tidak ada', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(9)).rejects.toBeInstanceOf(NotFoundException);
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
