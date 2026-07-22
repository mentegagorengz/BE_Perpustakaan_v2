import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    register: jest.Mock;
    login: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: service }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('register should delegate to service.register with the dto', async () => {
    const dto = {
      email: 'new@example.com',
      password: 'secret123',
      identification_number: '123',
      full_name: 'New User',
    } as never;
    const created = { id: 1, email: 'new@example.com' };
    service.register.mockResolvedValue(created);

    await expect(controller.register(dto)).resolves.toBe(created);
    expect(service.register).toHaveBeenCalledWith(dto);
  });

  it('login should delegate to service.login with the dto', async () => {
    const dto = { email: 'user@example.com', password: 'secret123' } as never;
    const token = { access_token: 'jwt', user: { id: 1 } };
    service.login.mockResolvedValue(token);

    await expect(controller.login(dto)).resolves.toBe(token);
    expect(service.login).toHaveBeenCalledWith(dto);
  });

  it('getProfile returns the authenticated user as attached to the request', async () => {
    const user = { id: 1, email: 'user@example.com', role: 'USER' };

    await expect(controller.getProfile(user)).resolves.toBe(user);
  });

  describe('route protection (security)', () => {
    it('protects the profile route with JwtAuthGuard', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        controller.getProfile,
      ) as unknown[];

      expect(guards).toContain(JwtAuthGuard);
    });

    it('leaves register and login public (no guard)', () => {
      const registerGuards = Reflect.getMetadata(
        '__guards__',
        controller.register,
      );
      const loginGuards = Reflect.getMetadata('__guards__', controller.login);

      expect(registerGuards).toBeUndefined();
      expect(loginGuards).toBeUndefined();
    });
  });
});
