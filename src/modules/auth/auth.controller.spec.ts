import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let service: {
    register: jest.Mock;
    login: jest.Mock;
    rotateRefreshTokenWithGracePeriod: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      register: jest.fn(),
      login: jest.fn(),
      rotateRefreshTokenWithGracePeriod: jest.fn(),
      logout: jest.fn(),
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

  it('login should set access_token and refresh_token cookies and return response payload', async () => {
    const dto = { email: 'user@example.com', password: 'secret123' } as never;
    const tokenPayload = {
      accessToken: 'jwt',
      refreshToken: 'refresh',
      user: { id: 1 },
    };
    service.login.mockResolvedValue(tokenPayload);
    const response = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    } as never;

    await expect(controller.login(dto, response)).resolves.toEqual({
      user: { id: 1 },
      refreshToken: 'refresh',
    });
    expect(service.login).toHaveBeenCalledWith(dto);
    expect((response as { cookie: jest.Mock }).cookie).toHaveBeenCalledTimes(2);
  });

  it('refresh should read token from cookie when body is empty', async () => {
    service.rotateRefreshTokenWithGracePeriod.mockResolvedValue({
      accessToken: 'new_jwt',
      refreshToken: 'new_refresh',
    });

    const req = { cookies: { refresh_token: 'cookie_refresh_token' } } as never;
    const response = { cookie: jest.fn() } as never;

    const result = await controller.refresh(req, {}, response);
    expect(result).toEqual({
      accessToken: 'new_jwt',
      refreshToken: 'new_refresh',
    });
    expect(service.rotateRefreshTokenWithGracePeriod).toHaveBeenCalledWith(
      'cookie_refresh_token',
    );
    expect((response as { cookie: jest.Mock }).cookie).toHaveBeenCalledTimes(2);
  });

  it('logout should clear cookies and call logout service', async () => {
    service.logout.mockResolvedValue(undefined);
    const req = { cookies: { refresh_token: 'cookie_refresh' } } as never;
    const response = { clearCookie: jest.fn() } as never;

    await expect(controller.logout(req, {}, response)).resolves.toBeUndefined();
    expect(service.logout).toHaveBeenCalledWith('cookie_refresh');
    expect(
      (response as { clearCookie: jest.Mock }).clearCookie,
    ).toHaveBeenCalledTimes(2);
  });

  it('getProfile returns the authenticated user as attached to the request', async () => {
    const user = { id: 1, email: 'user@example.com', role: 'USER' };

    expect(controller.getProfile(user)).toEqual(user);
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
