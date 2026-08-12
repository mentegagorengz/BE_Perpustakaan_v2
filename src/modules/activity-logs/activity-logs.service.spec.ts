import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog } from './entities/activity-log.entity';

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;
  let repo: jest.Mocked<Repository<ActivityLog>>;

  beforeEach(async () => {
    const repoMock = {
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        { provide: getRepositoryToken(ActivityLog), useValue: repoMock },
      ],
    }).compile();

    service = moduleRef.get(ActivityLogsService);
    repo = moduleRef.get(getRepositoryToken(ActivityLog));
  });

  it('create membuat dan menyimpan log', async () => {
    const data = { action: 'LOGIN', module: 'AUTH' };
    repo.create.mockReturnValue(data as ActivityLog);
    repo.save.mockResolvedValue({ ...data, id: 1 } as ActivityLog);

    const result = await service.create(data);

    expect(repo.create).toHaveBeenCalledWith(data);
    expect(repo.save).toHaveBeenCalledWith(data);
    expect(result).toEqual({ ...data, id: 1 });
  });

  it('findAll mengembalikan pagination beserta relasi user', async () => {
    repo.findAndCount.mockResolvedValue([[{ id: 1 } as ActivityLog], 3]);

    const result = await service.findAll({ page: 2, limit: 5 });

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        relations: ['user'],
        skip: 5,
        take: 5,
      }),
    );
    expect(result.meta).toEqual({
      page: 2,
      limit: 5,
      total_items: 3,
      total_pages: 1,
      has_next_page: false,
      has_prev_page: true,
    });
  });

  it('findAll memakai default page 1 dan limit 10 bila tidak dikirim', async () => {
    repo.findAndCount.mockResolvedValue([[], 0]);

    const result = await service.findAll({});

    expect(repo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
    expect(result.meta.total_pages).toBe(0);
  });

  it('create menyimpan log dengan relasi user bila disertakan', async () => {
    const user = { id: 2 } as ActivityLog['user'];
    const data = { action: 'DELETE', module: 'BOOKS', user };
    repo.create.mockReturnValue(data as ActivityLog);
    repo.save.mockResolvedValue({ ...data, id: 9 } as ActivityLog);

    const result = await service.create(data);

    expect(repo.create).toHaveBeenCalledWith(data);
    expect(result).toEqual({ ...data, id: 9 });
  });
});
