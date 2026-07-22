import { Test, TestingModule } from '@nestjs/testing';
import { LanguagesController } from './languages.controller';
import { LanguagesService } from './languages.service';

describe('LanguagesController', () => {
  let controller: LanguagesController;
  let service: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanguagesController],
      providers: [{ provide: LanguagesService, useValue: service }],
    }).compile();

    controller = module.get<LanguagesController>(LanguagesController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('create should delegate to service.create with the dto', async () => {
    const dto = { name: 'English', code: 'en' };
    const created = { id: 1, ...dto };
    service.create.mockResolvedValue(created);

    await expect(controller.create(dto)).resolves.toBe(created);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('findAll should delegate to service.findAll with pagination', async () => {
    const pagination = { page: 1, limit: 10 };
    const result = { data: [], meta: {} };
    service.findAll.mockResolvedValue(result);

    await expect(controller.findAll(pagination)).resolves.toBe(result);
    expect(service.findAll).toHaveBeenCalledWith(pagination);
  });

  it('findOne should delegate to service.findOne with numeric id', async () => {
    const entity = { id: 5 };
    service.findOne.mockResolvedValue(entity);

    await expect(controller.findOne('5')).resolves.toBe(entity);
    expect(service.findOne).toHaveBeenCalledWith(5);
  });

  it('update should delegate to service.update with numeric id and dto', async () => {
    const dto = { name: 'New' };
    const updated = { id: 5, ...dto };
    service.update.mockResolvedValue(updated);

    await expect(controller.update('5', dto)).resolves.toBe(updated);
    expect(service.update).toHaveBeenCalledWith(5, dto);
  });

  it('remove should delegate to service.remove with numeric id', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('5');
    expect(service.remove).toHaveBeenCalledWith(5);
  });
});
