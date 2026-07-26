import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Auth audit fix — proves the PER-IP throttle really is wired onto POST
// /auth/login (not just configured-but-unused): boots only AuthController +
// a real ThrottlerModule (in-memory storage, no Redis needed for this part)
// with a stubbed AuthService, so this test is about the HTTP-layer guard,
// not credential logic (that's auth.service.spec.ts).
describe('AuthController — login rate limiting (audit fix)', () => {
  let app: INestApplication<App>;
  let validateUser: jest.Mock;

  beforeEach(async () => {
    validateUser = jest
      .fn()
      .mockRejectedValue(new UnauthorizedException('Invalid credentials'));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }])],
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: { validateUser, login: jest.fn() },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows the first 5 login requests per minute from the same IP', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'wrong' });
      // Not throttled — the stub AuthService rejects with 401, which is the
      // expected "request got through to the handler" outcome here.
      expect(res.status).toBe(401);
    }
  });

  it('rejects the 6th login request within the same minute with 429', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'user@example.com', password: 'wrong' });
    }

    const sixth = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'wrong' });

    expect(sixth.status).toBe(429);
    // The handler (and therefore AuthService.validateUser) must never run
    // for the throttled request.
    expect(validateUser).toHaveBeenCalledTimes(5);
  });
});
