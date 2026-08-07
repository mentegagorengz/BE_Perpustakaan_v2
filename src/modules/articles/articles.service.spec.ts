import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';

describe('ArticlesService', () => {
  let service: ArticlesService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArticlesService,
        { provide: getRepositoryToken(Article), useValue: repo },
      ],
    }).compile();

    service = module.get<ArticlesService>(ArticlesService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const dto: CreateArticleDto = {
      title: 'Judul',
      content: 'Isi berita',
    };

    it('builds the entity with the author id taken from user.id and persists it', async () => {
      const built = { ...dto, author: { id: 7 } };
      const saved = { id: 1, ...built };
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(saved);

      const result = await service.create(dto, { id: 7 });

      expect(repo.create).toHaveBeenCalledWith({
        ...dto,
        author: { id: 7 },
      });
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(saved);
    });

    it('mengambil id penulis dari user.id dan mem-persist', async () => {
      repo.create.mockReturnValue({});
      repo.save.mockResolvedValue({});

      await service.create(dto, { id: 42 });

      expect(repo.create).toHaveBeenCalledWith({
        ...dto,
        author: { id: 42 },
      });
    });
  });

  describe('createMany', () => {
    it('maps every dto to include the author id and persists the batch', async () => {
      const dtos: CreateArticleDto[] = [
        { title: 'A', content: 'a' },
        { title: 'B', content: 'b' },
      ];
      const built = dtos.map((d) => ({ ...d, author: { id: 5 } }));
      repo.create.mockReturnValue(built);
      repo.save.mockResolvedValue(built);

      const result = await service.createMany(dtos, { id: 5 });

      expect(repo.create).toHaveBeenCalledWith([
        { title: 'A', content: 'a', author: { id: 5 } },
        { title: 'B', content: 'b', author: { id: 5 } },
      ]);
      expect(repo.save).toHaveBeenCalledWith(built);
      expect(result).toBe(built);
    });
  });

  describe('findAll', () => {
    it('returns articles with author relation ordered by created_at DESC', async () => {
      const articles = [{ id: 1 }, { id: 2 }];
      repo.find.mockResolvedValue(articles);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        relations: ['author'],
        order: { created_at: 'DESC' },
      });
      expect(result).toBe(articles);
    });
  });

  describe('findOne', () => {
    it('returns the article when it exists', async () => {
      const article = { id: 3, title: 'X' };
      repo.findOne.mockResolvedValue(article);

      const result = await service.findOne(3);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 3 },
        relations: ['author'],
      });
      expect(result).toBe(article);
    });

    it('throws NotFoundException when the article is missing', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('merges the payload onto the existing article and saves it', async () => {
      const existing = { id: 4, title: 'Old', content: 'old' };
      repo.findOne.mockResolvedValue({ ...existing });
      repo.save.mockImplementation((a) => Promise.resolve(a));

      const result = await service.update(4, { title: 'New' });

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 4, title: 'New', content: 'old' }),
      );
      expect(result).toEqual(expect.objectContaining({ id: 4, title: 'New' }));
    });

    it('throws NotFoundException when updating a missing article', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update(99, { title: 'x' })).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes the existing article', async () => {
      const existing = { id: 6 };
      repo.findOne.mockResolvedValue(existing);
      repo.remove.mockResolvedValue(existing);

      const result = await service.remove(6);

      expect(repo.remove).toHaveBeenCalledWith(existing);
      expect(result).toBe(existing);
    });

    it('throws NotFoundException when removing a missing article', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });
  });
});
