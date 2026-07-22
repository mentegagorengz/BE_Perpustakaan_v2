import { Test, TestingModule } from '@nestjs/testing';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

describe('DashboardController', () => {
  let controller: DashboardController;
  let service: { getSummary: jest.Mock };

  beforeEach(async () => {
    service = { getSummary: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DashboardController],
      providers: [{ provide: DashboardService, useValue: service }],
    }).compile();

    controller = module.get<DashboardController>(DashboardController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    it('delegates to DashboardService.getSummary and returns its result', async () => {
      const summary = {
        total_books: 1,
        total_users: 2,
        total_logs: 3,
        login_attempts: 4,
        failed_actions: 5,
        server_status: 'ONLINE',
        last_updated: new Date().toISOString(),
      };
      service.getSummary.mockResolvedValue(summary);

      const result = await controller.getSummary();

      expect(service.getSummary).toHaveBeenCalledTimes(1);
      expect(result).toBe(summary);
    });
  });
});
