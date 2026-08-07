import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';

describe('ActivityLogsController', () => {
  let controller: ActivityLogsController;
  const service = { findAll: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ActivityLogsController],
      providers: [{ provide: ActivityLogsService, useValue: service }],
    }).compile();

    controller = moduleRef.get(ActivityLogsController);
  });

  it('mendelegasikan findAll ke service', async () => {
    const expected = { data: [], meta: { total: 0 } };
    service.findAll.mockResolvedValue(expected);

    const result = await controller.findAll({ page: 1, limit: 10 });

    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 10 });
    expect(result).toBe(expected);
  });
});
