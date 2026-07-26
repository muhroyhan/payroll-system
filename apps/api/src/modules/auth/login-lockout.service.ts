import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { LOGIN_LOCKOUT_REDIS } from './login-lockout.constants';

const MAX_CONSECUTIVE_FAILURES = 5;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 15 minutes

// Auth audit fix — brute-force protection, PER-USERNAME (not per-IP), so
// credential-stuffing spread across many IPs is caught too, on top of the
// per-IP throttle already applied to POST /auth/login (auth.controller.ts).
//
// One Redis key per normalized email does double duty: its VALUE is the
// consecutive-failure count, and its own TTL is both (a) the window within
// which failures count as "consecutive" and (b) the lockout release timer —
// once it expires, Redis itself wipes the slate clean, no separate "locked"
// flag needed. TTL is refreshed on every failed attempt (sliding window), so
// "consecutive" in practice means "no idle gap longer than
// LOCKOUT_WINDOW_SECONDS and no successful login in between" — an attacker
// spacing attempts out slower than the window never accumulates, which is an
// acceptable trade since that pace isn't a meaningful brute-force threat.
//
// Keyed on the raw submitted (normalized) email regardless of whether the
// account actually exists, and checked BEFORE the user lookup / password
// compare in AuthService — so a non-existent email behaves identically to a
// real one from the caller's point of view (anti-enumeration: lockout
// behavior itself must not leak which emails are registered).
@Injectable()
export class LoginLockoutService implements OnModuleDestroy {
  constructor(@Inject(LOGIN_LOCKOUT_REDIS) private readonly redis: Redis) {}

  private key(normalizedEmail: string): string {
    return `auth:login-fails:${normalizedEmail}`;
  }

  // Throws a generic 429 — no username, no failure count, no "why" beyond
  // how long to wait — if this email is currently locked out.
  async assertNotLocked(normalizedEmail: string): Promise<void> {
    const key = this.key(normalizedEmail);
    const count = await this.redis.get(key);
    if (count !== null && Number(count) >= MAX_CONSECUTIVE_FAILURES) {
      const ttl = await this.redis.ttl(key);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many failed login attempts. Please try again later.',
          retryAfterSeconds: ttl > 0 ? ttl : LOCKOUT_WINDOW_SECONDS,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  // INCR + EXPIRE atomically (MULTI) so a crash between the two can never
  // leave the counter without a TTL (which would make it stick around
  // forever instead of self-releasing).
  async recordFailedAttempt(normalizedEmail: string): Promise<void> {
    const key = this.key(normalizedEmail);
    await this.redis.multi().incr(key).expire(key, LOCKOUT_WINDOW_SECONDS).exec();
  }

  // Called on every successful login — a genuine credential match always
  // clears the slate, regardless of how many failures preceded it.
  async resetAttempts(normalizedEmail: string): Promise<void> {
    await this.redis.del(this.key(normalizedEmail));
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
