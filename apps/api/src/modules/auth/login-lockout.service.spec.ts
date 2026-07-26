import { HttpException, HttpStatus } from '@nestjs/common';
import { LoginLockoutService } from './login-lockout.service';

describe('LoginLockoutService', () => {
  function makeService() {
    const execMock = jest.fn().mockResolvedValue(undefined);
    const multiMock = {
      incr: jest.fn().mockReturnThis(),
      expire: jest.fn().mockReturnThis(),
      exec: execMock,
    };
    const redis = {
      get: jest.fn(),
      ttl: jest.fn(),
      del: jest.fn(),
      multi: jest.fn().mockReturnValue(multiMock),
      quit: jest.fn().mockResolvedValue(undefined),
    };
    const service = new LoginLockoutService(redis as any);
    return { service, redis, multiMock };
  }

  describe('assertNotLocked', () => {
    it('does nothing when there is no counter yet (never failed)', async () => {
      const { service, redis } = makeService();
      redis.get.mockResolvedValue(null);

      await expect(
        service.assertNotLocked('user@example.com'),
      ).resolves.toBeUndefined();
      expect(redis.get).toHaveBeenCalledWith('auth:login-fails:user@example.com');
    });

    it('does nothing when the failure count is below the threshold', async () => {
      const { service, redis } = makeService();
      redis.get.mockResolvedValue('4');

      await expect(
        service.assertNotLocked('user@example.com'),
      ).resolves.toBeUndefined();
    });

    it('throws a generic 429 with retryAfterSeconds once the threshold is reached', async () => {
      const { service, redis } = makeService();
      redis.get.mockResolvedValue('5');
      redis.ttl.mockResolvedValue(842);

      await expect(
        service.assertNotLocked('user@example.com'),
      ).rejects.toMatchObject({
        status: HttpStatus.TOO_MANY_REQUESTS,
        response: {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many failed login attempts. Please try again later.',
          retryAfterSeconds: 842,
        },
      });
    });

    it('does not leak the email or the raw failure count in the error, only a generic message + retryAfterSeconds', async () => {
      const { service, redis } = makeService();
      redis.get.mockResolvedValue('37'); // a distinctive, easy-to-spot-if-leaked count
      redis.ttl.mockResolvedValue(842);

      try {
        await service.assertNotLocked('victim@example.com');
        fail('expected assertNotLocked to throw');
      } catch (error) {
        const body = (error as HttpException).getResponse() as Record<string, unknown>;
        expect(Object.keys(body).sort()).toEqual([
          'message',
          'retryAfterSeconds',
          'statusCode',
        ]);
        expect(body.message).toBe(
          'Too many failed login attempts. Please try again later.',
        );
        expect(JSON.stringify(body)).not.toContain('victim@example.com');
        expect(JSON.stringify(body)).not.toContain('37');
      }
    });

    // "Release setelah durasi habis": once Redis's own TTL expires the key,
    // GET returns null again and the account is usable — this is Redis's
    // guarantee, not application logic, so the unit test here is that our
    // code reacts correctly to that state (not a literal 15-minute wait).
    it('is usable again once the counter key has expired (GET returns null again)', async () => {
      const { service, redis } = makeService();
      redis.get.mockResolvedValueOnce('5'); // locked
      await expect(
        service.assertNotLocked('user@example.com'),
      ).rejects.toBeInstanceOf(HttpException);

      redis.get.mockResolvedValueOnce(null); // TTL elapsed, key gone
      await expect(
        service.assertNotLocked('user@example.com'),
      ).resolves.toBeUndefined();
    });
  });

  describe('recordFailedAttempt', () => {
    it('atomically increments the counter and (re)sets its TTL to the lockout window via MULTI/EXEC', async () => {
      const { service, redis, multiMock } = makeService();

      await service.recordFailedAttempt('user@example.com');

      expect(redis.multi).toHaveBeenCalledTimes(1);
      expect(multiMock.incr).toHaveBeenCalledWith(
        'auth:login-fails:user@example.com',
      );
      expect(multiMock.expire).toHaveBeenCalledWith(
        'auth:login-fails:user@example.com',
        900, // 15 minutes
      );
      expect(multiMock.exec).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetAttempts', () => {
    it('deletes the counter key (a successful login always clears prior failures)', async () => {
      const { service, redis } = makeService();

      await service.resetAttempts('user@example.com');

      expect(redis.del).toHaveBeenCalledWith(
        'auth:login-fails:user@example.com',
      );
    });
  });

  describe('onModuleDestroy', () => {
    it('quits the redis client', async () => {
      const { service, redis } = makeService();

      await service.onModuleDestroy();

      expect(redis.quit).toHaveBeenCalledTimes(1);
    });
  });
});
