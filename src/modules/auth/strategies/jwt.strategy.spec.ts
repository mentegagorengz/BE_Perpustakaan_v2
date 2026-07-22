import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from '../../users/users.service';
import { SystemRole, UserCategory } from '../../../common/enums/role.enum';
import { User } from '../../users/entities/user.entity';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };

  const buildUser = (overrides: Partial<User> = {}): User =>
    ({
      id: 1,
      identification_number: '1234567890',
      email: 'user@example.com',
      password: 'hashed-password',
      full_name: 'John Doe',
      role: SystemRole.USER,
      category: UserCategory.STUDENT,
      created_at: new Date('2026-01-01T00:00:00Z'),
      updated_at: new Date('2026-01-01T00:00:00Z'),
      ...overrides,
    }) as User;

  beforeEach(async () => {
    usersService = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('test-secret') },
        },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns the sanitized identity for a valid payload', async () => {
    usersService.findById.mockResolvedValue(buildUser());

    const result = await strategy.validate({ sub: 1 });

    expect(usersService.findById).toHaveBeenCalledWith(1);
    expect(result).toEqual({
      id: 1,
      email: 'user@example.com',
      role: SystemRole.USER,
    });
  });

  it('does not leak the password hash into the request identity', async () => {
    usersService.findById.mockResolvedValue(buildUser());

    const result = await strategy.validate({ sub: 1 });

    expect(result).not.toHaveProperty('password');
  });

  it('throws UnauthorizedException (not NotFoundException) when the user no longer exists', async () => {
    // Token masih valid secara kriptografis, tapi user-nya sudah dihapus.
    // findById melempar NotFoundException → strategy harus menerjemahkannya
    // menjadi 401, bukan membocorkan 404.
    usersService.findById.mockRejectedValue(
      new NotFoundException('User with ID 1 not found'),
    );

    await expect(strategy.validate({ sub: 1 })).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
