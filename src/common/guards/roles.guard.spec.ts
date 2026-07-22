import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { SystemRole } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const buildContext = (user: unknown): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: () => undefined,
      getClass: () => undefined,
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('allows the request when no roles are required (public route)', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(buildContext({ role: SystemRole.USER }))).toBe(
      true,
    );
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
      undefined,
      undefined,
    ]);
  });

  it('allows the request when the user has one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([
      SystemRole.SUPER_ADMIN,
      SystemRole.STAFF,
    ]);

    expect(guard.canActivate(buildContext({ role: SystemRole.STAFF }))).toBe(
      true,
    );
  });

  it('denies the request when the user role is not among the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([SystemRole.SUPER_ADMIN]);

    expect(guard.canActivate(buildContext({ role: SystemRole.USER }))).toBe(
      false,
    );
  });

  it('fails closed (denies, does not throw) when no user is attached to the request', () => {
    reflector.getAllAndOverride.mockReturnValue([SystemRole.SUPER_ADMIN]);

    expect(() => guard.canActivate(buildContext(undefined))).not.toThrow();
    expect(guard.canActivate(buildContext(undefined))).toBe(false);
  });
});
