import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  function makeStrategy(user: any) {
    const config = {
      get: jest.fn().mockReturnValue('a-long-enough-test-secret-value-123456'),
    };
    const usersService = {
      findById: jest.fn().mockResolvedValue(user),
    };
    const strategy = new JwtStrategy(config as any, usersService as any);
    return { strategy, usersService };
  }

  const payload = { sub: 'user-1', email: 'admin@example.com', role: Role.ADMIN };

  // Audit fix — the core claim: deactivating a user must reject their
  // existing (still cryptographically valid, unexpired) token on the very
  // next request, not just at natural expiry.
  it('rejects with 401 when the user has been deactivated since the token was issued', async () => {
    const { strategy, usersService } = makeStrategy({
      id: 'user-1',
      isActive: false,
    });

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(usersService.findById).toHaveBeenCalledWith('user-1');
  });

  it('rejects with 401 when the user no longer exists at all', async () => {
    const { strategy } = makeStrategy(null);

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('does not leak whether the account is missing vs. deactivated (same generic 401 either way)', async () => {
    const { strategy: missingStrategy } = makeStrategy(null);
    const { strategy: inactiveStrategy } = makeStrategy({
      id: 'user-1',
      isActive: false,
    });

    let missingMessage: string | undefined;
    let inactiveMessage: string | undefined;
    try {
      await missingStrategy.validate(payload);
    } catch (e) {
      missingMessage = (e as UnauthorizedException).message;
    }
    try {
      await inactiveStrategy.validate(payload);
    } catch (e) {
      inactiveMessage = (e as UnauthorizedException).message;
    }

    expect(missingMessage).toBe(inactiveMessage);
  });

  it('accepts an active user and returns the AuthenticatedUser shape from the token payload', async () => {
    const { strategy } = makeStrategy({ id: 'user-1', isActive: true });

    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'user-1',
      email: 'admin@example.com',
      role: Role.ADMIN,
    });
  });

  it('queries the DB directly on every call (no cache) — the conservative default for an auth-path check', async () => {
    const { strategy, usersService } = makeStrategy({
      id: 'user-1',
      isActive: true,
    });

    await strategy.validate(payload);
    await strategy.validate(payload);
    await strategy.validate(payload);

    expect(usersService.findById).toHaveBeenCalledTimes(3);
  });
});
