import { Test, TestingModule } from '@nestjs/testing';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';

describe('ArticlesController', () => {
  let controller: ArticlesController;
  let service: {
    findAll: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
    createMany: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      createMany: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [{ provide: ArticlesService, useValue: service }],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to the service', async () => {
    const articles = [{ id: 1 }];
    service.findAll.mockResolvedValue(articles);

    await expect(controller.findAll()).resolves.toBe(articles);
    expect(service.findAll).toHaveBeenCalledWith();
  });

  it('findOne parses the id and delegates to the service', async () => {
    const article = { id: 5 };
    service.findOne.mockResolvedValue(article);

    await expect(controller.findOne('5')).resolves.toBe(article);
    expect(service.findOne).toHaveBeenCalledWith(5);
  });

  it('create forwards the dto and the authenticated user', async () => {
    const dto: CreateArticleDto = { title: 'T', content: 'C' };
    const req = { user: { id: 9 } };
    const created = { id: 1, ...dto };
    service.create.mockResolvedValue(created);

    await expect(controller.create(dto, req)).resolves.toBe(created);
    expect(service.create).toHaveBeenCalledWith(dto, req.user);
  });

  it('update parses the id and forwards the payload', async () => {
    const payload = { title: 'New' };
    const updated = { id: 3, title: 'New' };
    service.update.mockResolvedValue(updated);

    await expect(controller.update('3', payload)).resolves.toBe(updated);
    expect(service.update).toHaveBeenCalledWith(3, payload);
  });

  it('remove parses the id and delegates to the service', async () => {
    service.remove.mockResolvedValue({ id: 4 });

    await expect(controller.remove('4')).resolves.toEqual({ id: 4 });
    expect(service.remove).toHaveBeenCalledWith(4);
  });

  it('createMany forwards the dto array and the authenticated user', async () => {
    const dtos: CreateArticleDto[] = [{ title: 'A', content: 'a' }];
    const req = { user: { id: 2 } };
    service.createMany.mockResolvedValue(dtos);

    await expect(controller.createMany(dtos, req)).resolves.toBe(dtos);
    expect(service.createMany).toHaveBeenCalledWith(dtos, req.user);
  });
});
