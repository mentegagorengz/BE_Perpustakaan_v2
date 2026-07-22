import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PolicyService } from './policy.service';
import { Policy } from './entities/policy.entity';

describe('PolicyService', () => {
  let service: PolicyService;
  let repo: jest.Mocked<Repository<Policy>>;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PolicyService,
        {
          provide: getRepositoryToken(Policy),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
      ],
    }).compile();
    service = moduleRef.get(PolicyService);
    repo = moduleRef.get(getRepositoryToken(Policy));
  });

  it('getPolicy membuat default bila tabel kosong', async () => {
    repo.findOne.mockResolvedValue(null);
    const def = { id: 1, fine_per_day: 5000, loan_duration_days: 7, max_books_per_user: 3 } as Policy;
    repo.create.mockReturnValue(def);
    repo.save.mockResolvedValue(def);

    const result = await service.getPolicy();
    expect(repo.save).toHaveBeenCalled();
    expect(result.fine_per_day).toBe(5000);
  });

  it('update meng-merge field lalu save', async () => {
    const existing = { id: 1, fine_per_day: 5000, loan_duration_days: 7, max_books_per_user: 3 } as Policy;
    repo.findOne.mockResolvedValue(existing);
    repo.save.mockImplementation(async (p) => p as Policy);

    const result = await service.update({ fine_per_day: 2000 });
    expect(result.fine_per_day).toBe(2000);
    expect(result.loan_duration_days).toBe(7);
  });
});
