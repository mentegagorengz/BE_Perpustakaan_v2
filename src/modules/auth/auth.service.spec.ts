import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { createHash } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { SystemRole, UserCategory } from '../../common/enums/role.enum';

jest.mock('bcrypt');

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
  let service: AuthService;
  let usersService: {
    findByEmail: jest.Mock;
    findByIdentificationNumber: jest.Mock;
    findByEmailWithPassword: jest.Mock;
    create: jest.Mock;
    findById: jest.Mock;
  };
  let jwtService: { signAsync: jest.Mock };
  let refreshSessionRepository: {
    save: jest.Mock;
    create: jest.Mock;
    findOne: jest.Mock;
    findOneBy: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  const registerDto: RegisterDto = {
    identification_number: '1234567890',
    email: 'user@example.com',
    password: 'password123',
    full_name: 'John Doe',
    category: UserCategory.STUDENT,
  };

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
    usersService = {
      findByEmail: jest.fn(),
      findByIdentificationNumber: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };
    jwtService = {
      signAsync: jest.fn(),
    };
    refreshSessionRepository = {
      save: jest.fn().mockImplementation(async (entity) => entity),
      create: jest.fn((data) => data),
      findOne: jest.fn(),
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const mockManager = {
      getRepository: jest.fn(() => refreshSessionRepository),
    };
    const dataSource = {
      transaction: jest.fn(async (fn: (manager: unknown) => Promise<unknown>) =>
        fn(mockManager),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: DataSource, useValue: dataSource },
        {
          provide: getRepositoryToken(RefreshSession),
          useValue: refreshSessionRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    // Pesan generik yang sama untuk semua konflik registrasi, agar tidak
    // membocorkan field mana (email vs nomor identitas) yang sudah terdaftar
    // — mencegah user enumeration.
    const GENERIC_CONFLICT_MESSAGE = 'Data registrasi sudah terdaftar';

    it('throws ConflictException with a generic message when the email already exists', async () => {
      usersService.findByEmail.mockResolvedValue(buildUser());

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        GENERIC_CONFLICT_MESSAGE,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException with the same generic message when the identification number already exists', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByIdentificationNumber.mockResolvedValue(buildUser());

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(registerDto)).rejects.toThrow(
        GENERIC_CONFLICT_MESSAGE,
      );
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('hashes the password before persisting and never returns it', async () => {
      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByIdentificationNumber.mockResolvedValue(null);

      const genSaltSpy = mockedBcrypt.genSalt.mockResolvedValue(
        'salt' as never,
      );
      const hashSpy = mockedBcrypt.hash.mockResolvedValue(
        'hashed-password' as never,
      );

      usersService.create.mockImplementation(async (data) =>
        buildUser({ ...data }),
      );

      const result = await service.register(registerDto);

      expect(genSaltSpy).toHaveBeenCalledWith(10);
      expect(hashSpy).toHaveBeenCalledWith('password123', 'salt');
      expect(usersService.create).toHaveBeenCalledWith(
        expect.objectContaining({ password: 'hashed-password' }),
      );
      expect(result).not.toHaveProperty('password');
      expect(result.email).toBe('user@example.com');
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'user@example.com',
      password: 'password123',
    };

    it('throws UnauthorizedException when the user does not exist', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password is wrong', async () => {
      usersService.findByEmailWithPassword.mockResolvedValue(buildUser());
      mockedBcrypt.compare.mockResolvedValue(false as never);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('returns tokens and user payload on success, persisting a hashed session', async () => {
      const user = buildUser();
      usersService.findByEmailWithPassword.mockResolvedValue(user);
      mockedBcrypt.compare.mockResolvedValue(true as never);
      jwtService.signAsync.mockResolvedValue('signed-jwt-token');

      const result = await service.login(loginDto);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      expect(result.accessToken).toBe('signed-jwt-token');
      expect(result.refreshToken).toEqual(expect.any(String));
      expect(result.user).toEqual({
        id: user.id,
        full_name: user.full_name,
        role: user.role,
      });
      expect(result.user).not.toHaveProperty('password');

      // Sesi refresh disimpan sebagai hash SHA-256, bukan token mentah.
      expect(refreshSessionRepository.create).toHaveBeenCalled();
      const created = refreshSessionRepository.create.mock.calls[0][0];
      expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/i);
      expect(created.tokenHash).not.toBe(result.refreshToken);
      expect(created.user).toEqual({ id: user.id });
      expect(refreshSessionRepository.save).toHaveBeenCalled();
    });
  });

  describe('rotateRefreshTokenWithGracePeriod', () => {
    const buildSession = (overrides: Partial<RefreshSession> = {}): any => ({
      id: 'session-1',
      tokenHash: 'a'.repeat(64),
      previousTokenHash: null,
      user: { id: 1 },
      expiresAt: new Date(Date.now() + 60_000),
      graceExpiresAt: null,
      revokedAt: null,
      ...overrides,
    });

    const mockRawUser = (
      repo: {
        createQueryBuilder: jest.Mock;
      },
      userId = 1,
    ) => {
      repo.createQueryBuilder.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ userId }),
      });
    };

    it('throws when the token does not match any session', async () => {
      refreshSessionRepository.findOne.mockResolvedValue(null);

      await expect(
        service.rotateRefreshTokenWithGracePeriod('unknown-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when the session was revoked', async () => {
      refreshSessionRepository.findOne.mockResolvedValue(
        buildSession({ revokedAt: new Date() }),
      );

      await expect(
        service.rotateRefreshTokenWithGracePeriod('unknown-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(refreshSessionRepository.save).not.toHaveBeenCalled();
    });

    it('throws when the session is expired and revokes it', async () => {
      refreshSessionRepository.findOne.mockResolvedValue(
        buildSession({
          expiresAt: new Date(Date.now() - 1_000),
        }),
      );

      await expect(
        service.rotateRefreshTokenWithGracePeriod('unknown-token'),
      ).rejects.toThrow(UnauthorizedException);
      expect(refreshSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ revokedAt: expect.any(Date) }),
      );
    });

    it('rotates to a new refresh token and moves the previous hash into the grace window', async () => {
      refreshSessionRepository.findOne.mockResolvedValue(buildSession());
      mockRawUser(refreshSessionRepository, 1);
      usersService.findById.mockResolvedValue(buildUser());
      jwtService.signAsync.mockResolvedValue('next-access-token');

      const token = 'current-refresh-token';
      const result = await service.rotateRefreshTokenWithGracePeriod(token);

      expect(jwtService.signAsync).toHaveBeenCalled();
      expect(result.accessToken).toBe('next-access-token');
      expect(result.refreshToken).not.toBe(token);

      const saved = refreshSessionRepository.save.mock.calls.at(-1)[0];
      expect(saved.tokenHash).not.toBe('a'.repeat(64));
      expect(saved.previousTokenHash).toBe('a'.repeat(64));
      expect(saved.graceExpiresAt).toEqual(expect.any(Date));
    });

    it('serves a parallel refresh from the grace window without rotating again', async () => {
      const token = 'old-token-inside-grace-window';
      const hashedToken = createHash('sha256').update(token).digest('hex');
      refreshSessionRepository.findOne.mockResolvedValue(
        buildSession({
          tokenHash: 'b'.repeat(64),
          previousTokenHash: hashedToken,
          graceExpiresAt: new Date(Date.now() + 5_000),
        }),
      );
      mockRawUser(refreshSessionRepository, 1);
      usersService.findById.mockResolvedValue(buildUser());
      jwtService.signAsync.mockResolvedValue('access-token');

      const result = await service.rotateRefreshTokenWithGracePeriod(token);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe(token);
      expect(refreshSessionRepository.save).not.toHaveBeenCalled();
    });
  });
});
