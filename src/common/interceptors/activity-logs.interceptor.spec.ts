import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ExecutionContext } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { ActivityLogInterceptor } from './activity-logs.interceptor';
import { AUDIT_LOG_EVENT } from '../../modules/activity-logs/audit-log.event';

describe('ActivityLogInterceptor', () => {
  let interceptor: ActivityLogInterceptor;
  let emitter: { emit: jest.Mock };

  const buildInterceptor = async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogInterceptor,
        { provide: EventEmitter2, useValue: emitter },
      ],
    }).compile();
    return moduleRef.get(ActivityLogInterceptor);
  };

  const makeContext = (overrides: Partial<object> = {}): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({
          method: 'POST',
          url: '/api/v1/books',
          ip: '127.0.0.1',
          headers: { 'user-agent': 'jest' },
          user: { id: 1, full_name: 'Admin' },
          ...overrides,
        }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    emitter = { emit: jest.fn() };
    interceptor = await buildInterceptor();
  });

  it('meng-emit event audit.log saat request sukses', async () => {
    const context = makeContext();
    const result = await new Promise((resolve, reject) => {
      interceptor
        .intercept(context, { handle: () => of({ ok: true }) } as any)
        .subscribe({ next: resolve, error: reject });
    });

    expect(result).toEqual({ ok: true });
    expect(emitter.emit).toHaveBeenCalledWith(
      AUDIT_LOG_EVENT,
      expect.objectContaining({
        action: 'CREATE',
        status: 'SUCCESS',
        module: 'BOOKS',
        userId: 1,
      }),
    );
  });

  it('meng-emit event status FAILED saat request error', async () => {
    const context = makeContext({ method: 'DELETE' });
    await new Promise<void>((resolve) => {
      interceptor
        .intercept(context, {
          handle: () => throwError(() => new Error('boom')),
        } as any)
        .subscribe({
          error: () => resolve(),
        });
    });

    expect(emitter.emit).toHaveBeenCalledWith(
      AUDIT_LOG_EVENT,
      expect.objectContaining({ status: 'FAILED', action: 'DELETE' }),
    );
  });

  it('tidak meng-emit event untuk aksi baca (ACCESS_PAGE)', async () => {
    const context = makeContext({ method: 'GET', url: '/api/v1/categories' });
    await new Promise<void>((resolve) => {
      interceptor
        .intercept(context, { handle: () => of({}) } as any)
        .subscribe({ complete: resolve });
    });

    expect(emitter.emit).not.toHaveBeenCalled();
  });

  it('mengklasifikasikan auth/login sebagai LOGIN', async () => {
    const context = makeContext({ url: '/api/v1/auth/login' });
    await new Promise<void>((resolve) => {
      interceptor
        .intercept(context, { handle: () => of({}) } as any)
        .subscribe({ complete: resolve });
    });

    expect(emitter.emit).toHaveBeenCalledWith(
      AUDIT_LOG_EVENT,
      expect.objectContaining({ action: 'LOGIN' }),
    );
  });
});
