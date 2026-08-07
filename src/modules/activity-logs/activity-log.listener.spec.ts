import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogListener } from './activity-log.listener';
import { ActivityLogsService } from './activity-logs.service';
import { AUDIT_LOG_EVENT } from './audit-log.event';

describe('ActivityLogListener', () => {
  let listener: ActivityLogListener;
  let service: { create: jest.Mock };

  beforeEach(async () => {
    service = { create: jest.fn() };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogListener,
        { provide: ActivityLogsService, useValue: service },
      ],
    }).compile();

    listener = moduleRef.get(ActivityLogListener);
  });

  it('menyimpan log saat menerima event audit.log', async () => {
    service.create.mockResolvedValue({ id: 1 });

    await listener.handleAuditLogEvent({
      action: 'CREATE',
      module: 'BOOKS',
      details: 'Admin performed CREATE on /api/v1/books',
      status: 'SUCCESS',
      userId: 1,
    });

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CREATE',
        ip_address: undefined,
        user: { id: 1 },
      }),
    );
  });

  it('gagal menyimpan log TIDAK melempar ke caller (isolated try-catch)', async () => {
    service.create.mockRejectedValue(new Error('db down'));

    await expect(
      listener.handleAuditLogEvent({
        action: 'DELETE',
        module: 'BOOKS',
        details: 'x',
        status: 'FAILED',
      }),
    ).resolves.toBeUndefined();
  });

  it('tidak menyertakan relasi user bila userId tidak ada', async () => {
    service.create.mockResolvedValue({});

    await listener.handleAuditLogEvent({
      action: 'ACCESS_PAGE',
      module: 'SYSTEM',
      details: 'Guest',
      status: 'SUCCESS',
    });

    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: undefined }),
    );
  });
});
