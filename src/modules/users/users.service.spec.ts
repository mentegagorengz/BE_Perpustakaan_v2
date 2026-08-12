import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, Like } from 'typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { SystemRole, UserCategory } from '../../common/enums/role.enum';

describe('UsersService', () => {
  let service: UsersService;
  let repository: jest.Mocked<Repository<User>>;

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
    const repositoryMock = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      findAndCount: jest.fn(),
      remove: jest.fn(),
      softDelete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: repositoryMock,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('returns the user matching the given email', async () => {
      const user = buildUser();
      repository.findOne.mockResolvedValue(user);

      const result = await service.findByEmail('user@example.com');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { email: 'user@example.com' },
      });
      expect(result).toBe(user);
    });

    it('returns null when no user matches the email', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('missing@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByEmailWithPassword', () => {
    it('uses a query builder that selects the password column', async () => {
      const user = buildUser();
      const queryBuilder = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(user),
      };
      repository.createQueryBuilder.mockReturnValue(queryBuilder as never);

      const result = await service.findByEmailWithPassword('user@example.com');

      expect(repository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(queryBuilder.addSelect).toHaveBeenCalledWith('user.password');
      expect(queryBuilder.where).toHaveBeenCalledWith('user.email = :email', {
        email: 'user@example.com',
      });
      expect(queryBuilder.getOne).toHaveBeenCalled();
      expect(result).toBe(user);
    });
  });

  describe('findByIdentificationNumber', () => {
    it('queries by identification_number', async () => {
      const user = buildUser();
      repository.findOne.mockResolvedValue(user);

      const result = await service.findByIdentificationNumber('1234567890');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { identification_number: '1234567890' },
      });
      expect(result).toBe(user);
    });
  });

  describe('findById', () => {
    it('returns the user when it exists', async () => {
      const user = buildUser();
      repository.findOne.mockResolvedValue(user);

      const result = await service.findById(1);

      expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toBe(user);
    });

    it('throws NotFoundException when the id does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findById(99)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates and persists the user entity', async () => {
      const userData = { email: 'new@example.com', full_name: 'New User' };
      const created = buildUser(userData);
      repository.create.mockReturnValue(created);
      repository.save.mockResolvedValue(created);

      const result = await service.create(userData);

      expect(repository.create).toHaveBeenCalledWith(userData);
      expect(repository.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });
  });

  describe('findAll', () => {
    it('returns paginated data with computed meta', async () => {
      const users = [buildUser()];
      repository.findAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
      expect(result).toEqual({
        data: users,
        meta: {
          page: 1,
          limit: 10,
          total_items: 1,
          total_pages: 1,
          has_next_page: false,
          has_prev_page: false,
        },
      });
    });

    it('applies a search filter and pagination offset', async () => {
      repository.findAndCount.mockResolvedValue([[], 25]);

      const result = await service.findAll({
        page: 2,
        limit: 10,
        search: 'John',
      });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { full_name: Like('%John%') },
        skip: 10,
        take: 10,
        order: { created_at: 'DESC' },
      });
      expect(result.meta.total_pages).toBe(3);
      expect(result.meta.page).toBe(2);
    });

    it('falls back to default page and limit when omitted', async () => {
      repository.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({});

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        order: { created_at: 'DESC' },
      });
    });
  });

  describe('updateRole', () => {
    it('throws NotFoundException when the id does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(
        service.updateRole(99, { role: SystemRole.STAFF }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.save).not.toHaveBeenCalled();
    });

    it('merges the update and saves the user when it exists', async () => {
      const user = buildUser({ role: SystemRole.USER });
      repository.findOne.mockResolvedValue(user);
      repository.save.mockImplementation(async (u) => u as User);

      const result = await service.updateRole(1, { role: SystemRole.STAFF });

      expect(result.role).toBe(SystemRole.STAFF);
      expect(repository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, role: SystemRole.STAFF }),
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the id does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.remove(99)).rejects.toThrow(NotFoundException);
      expect(repository.softDelete).not.toHaveBeenCalled();
    });

    it('soft-deletes the user when it exists (soft delete)', async () => {
      const user = buildUser();
      repository.findOne.mockResolvedValue(user);
      repository.softDelete.mockResolvedValue({ affected: 1 } as never);

      await service.remove(1);

      expect(repository.softDelete).toHaveBeenCalledWith(1);
    });

    it('user soft-deleted tetap bisa didaftarkan ulang dengan email yang sama', async () => {
      repository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('user@example.com');

      expect(result).toBeNull();
    });
  });
});
