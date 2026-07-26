import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  function makeService(user: any = null) {
    const usersService = {
      findByEmail: jest.fn().mockResolvedValue(user),
    };
    const jwtService = {
      sign: jest.fn().mockReturnValue('signed-jwt'),
    };
    const loginLockoutService = {
      assertNotLocked: jest.fn().mockResolvedValue(undefined),
      recordFailedAttempt: jest.fn().mockResolvedValue(undefined),
      resetAttempts: jest.fn().mockResolvedValue(undefined),
    };
    const service = new AuthService(
      usersService as any,
      jwtService as any,
      loginLockoutService as any,
    );
    return { service, usersService, jwtService, loginLockoutService };
  }

  async function activeUser(password: string) {
    return {
      id: 'user-1',
      email: 'Admin@Example.com',
      role: 'admin',
      isActive: true,
      passwordHash: await bcrypt.hash(password, 4),
    };
  }

  describe('validateUser', () => {
    it('checks lockout BEFORE looking up the user, keyed on the normalized (trimmed, lowercased) email', async () => {
      const { service, usersService, loginLockoutService } = makeService(null);

      await expect(
        service.validateUser(' Admin@Example.com ', 'whatever'),
      ).rejects.toThrow(UnauthorizedException);

      expect(loginLockoutService.assertNotLocked).toHaveBeenCalledWith(
        'admin@example.com',
      );
      // Lockout check happens first in source order — verify it was called
      // before the user lookup that follows it.
      expect(
        loginLockoutService.assertNotLocked.mock.invocationCallOrder[0],
      ).toBeLessThan(usersService.findByEmail.mock.invocationCallOrder[0]);
    });

    it('propagates a lockout rejection without ever querying the user', async () => {
      const { service, usersService, loginLockoutService } = makeService(null);
      loginLockoutService.assertNotLocked.mockRejectedValue(
        new Error('locked out'),
      );

      await expect(
        service.validateUser('user@example.com', 'whatever'),
      ).rejects.toThrow('locked out');
      expect(usersService.findByEmail).not.toHaveBeenCalled();
    });

    it('records a failed attempt when the email does not exist', async () => {
      const { service, loginLockoutService } = makeService(null);

      await expect(
        service.validateUser('nobody@example.com', 'whatever'),
      ).rejects.toThrow(UnauthorizedException);

      expect(loginLockoutService.recordFailedAttempt).toHaveBeenCalledWith(
        'nobody@example.com',
      );
      expect(loginLockoutService.resetAttempts).not.toHaveBeenCalled();
    });

    it('records a failed attempt when the user is inactive', async () => {
      const user = await activeUser('correct-password');
      user.isActive = false;
      const { service, loginLockoutService } = makeService(user);

      await expect(
        service.validateUser('admin@example.com', 'correct-password'),
      ).rejects.toThrow(UnauthorizedException);

      expect(loginLockoutService.recordFailedAttempt).toHaveBeenCalledWith(
        'admin@example.com',
      );
    });

    it('records a failed attempt when the password is wrong', async () => {
      const user = await activeUser('correct-password');
      const { service, loginLockoutService } = makeService(user);

      await expect(
        service.validateUser('admin@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);

      expect(loginLockoutService.recordFailedAttempt).toHaveBeenCalledWith(
        'admin@example.com',
      );
      expect(loginLockoutService.resetAttempts).not.toHaveBeenCalled();
    });

    it('resets the failure counter on a successful login (does not merely skip recording)', async () => {
      const user = await activeUser('correct-password');
      const { service, loginLockoutService } = makeService(user);

      const result = await service.validateUser(
        'admin@example.com',
        'correct-password',
      );

      expect(result).toBe(user);
      expect(loginLockoutService.resetAttempts).toHaveBeenCalledWith(
        'admin@example.com',
      );
      expect(loginLockoutService.recordFailedAttempt).not.toHaveBeenCalled();
    });
  });
});
