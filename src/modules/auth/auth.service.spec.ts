import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
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
  };
  let jwtService: { signAsync: jest.Mock };

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
    };
    jwtService = {
      signAsync: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
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

      const genSaltSpy = mockedBcrypt.genSalt.mockResolvedValue('salt' as never);
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

    it('returns an access token and user payload on success', async () => {
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
      expect(result).toEqual({
        access_token: 'signed-jwt-token',
        user: {
          id: user.id,
          full_name: user.full_name,
          role: user.role,
        },
      });
      expect(result.user).not.toHaveProperty('password');
    });
  });
});
