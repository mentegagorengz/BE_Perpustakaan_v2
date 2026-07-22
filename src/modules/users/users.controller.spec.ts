import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';

describe('UsersController', () => {
  let controller: UsersController;
  let service: {
    findAll: jest.Mock;
    findById: jest.Mock;
    updateRole: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAll: jest.fn(),
      findById: jest.fn(),
      updateRole: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findAll delegates to service.findAll with pagination', async () => {
    const pagination = { page: 1, limit: 10 };
    const result = { data: [], meta: {} };
    service.findAll.mockResolvedValue(result);

    await expect(controller.findAll(pagination)).resolves.toBe(result);
    expect(service.findAll).toHaveBeenCalledWith(pagination);
  });

  it('findOne delegates to service.findById with numeric id', async () => {
    const user = { id: 5 };
    service.findById.mockResolvedValue(user);

    await expect(controller.findOne('5')).resolves.toBe(user);
    expect(service.findById).toHaveBeenCalledWith(5);
  });

  it('updateRole delegates to service.updateRole with numeric id and dto', async () => {
    const dto = { role: SystemRole.STAFF } as never;
    const updated = { id: 5, role: SystemRole.STAFF };
    service.updateRole.mockResolvedValue(updated);

    await expect(controller.updateRole('5', dto)).resolves.toBe(updated);
    expect(service.updateRole).toHaveBeenCalledWith(5, dto);
  });

  it('remove delegates to service.remove with numeric id', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('5');
    expect(service.remove).toHaveBeenCalledWith(5);
  });

  describe('RBAC protection (security)', () => {
    it('guards the whole controller with JwtAuthGuard and RolesGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        UsersController,
      ) as unknown[];

      expect(guards).toEqual(
        expect.arrayContaining([JwtAuthGuard, RolesGuard]),
      );
    });

    it('restricts listing users to SUPER_ADMIN and STAFF', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.findAll);

      expect(roles).toEqual([SystemRole.SUPER_ADMIN, SystemRole.STAFF]);
    });

    it('restricts reading a single user to SUPER_ADMIN and STAFF', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.findOne);

      expect(roles).toEqual([SystemRole.SUPER_ADMIN, SystemRole.STAFF]);
    });

    it('restricts changing a user role to SUPER_ADMIN only', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.updateRole);

      expect(roles).toEqual([SystemRole.SUPER_ADMIN]);
    });

    it('restricts deleting a user to SUPER_ADMIN only', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, controller.remove);

      expect(roles).toEqual([SystemRole.SUPER_ADMIN]);
    });
  });
});
