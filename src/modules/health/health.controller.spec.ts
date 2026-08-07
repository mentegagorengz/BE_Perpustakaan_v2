import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckService, TypeOrmHealthIndicator } from '@nestjs/terminus';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let health: { check: jest.Mock };
  let db: { pingCheck: jest.Mock };

  beforeEach(async () => {
    health = { check: jest.fn() };
    db = { pingCheck: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: health },
        { provide: TypeOrmHealthIndicator, useValue: db },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates to Terminus health check service', async () => {
    const expected = {
      status: 'ok',
      info: { database: { status: 'up' } },
    };
    health.check.mockImplementation((checks: (() => Promise<unknown>)[]) => {
      const first = checks[0];
      expect(typeof first).toBe('function');
      return Promise.resolve(expected);
    });

    const result = await controller.check();

    expect(result).toEqual(expected);
    expect(db.pingCheck).not.toHaveBeenCalled();
  });

  it('registers a database ping check for the TypeORM connection', async () => {
    db.pingCheck.mockReturnValue(Promise.resolve({ status: 'up' }));
    health.check.mockImplementation((checks: (() => Promise<unknown>)[]) =>
      Promise.all(checks.map((check) => check())),
    );

    const result = await controller.check();

    expect(result).toEqual([{ status: 'up' }]);
    expect(db.pingCheck).toHaveBeenCalledWith('database');
  });
});
