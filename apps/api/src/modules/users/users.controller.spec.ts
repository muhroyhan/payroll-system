import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import type { App } from 'supertest/types';
import { Role } from '@payroll-system/shared-types';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// Audit fix — proves the deactivate/reactivate endpoints are actually
// ADMIN-only over real HTTP, using the REAL RolesGuard + Reflector (only
// JwtAuthGuard is stubbed, to simulate "already authenticated as role X"
// without needing a real JWT). If a future edit accidentally drops
// @Roles(Role.ADMIN) from these two methods, this test — not just a code
// review — catches it.
describe('UsersController — deactivate/reactivate access control (audit fix)', () => {
  let app: INestApplication<App>;
  let setActive: jest.Mock;

  beforeEach(async () => {
    setActive = jest.fn().mockResolvedValue({ id: 'user-2', isActive: false });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: { setActive, list: jest.fn(), create: jest.fn() } },
        RolesGuard,
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = { id: 'actor-1', role: req.headers['x-test-role'] };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('allows ADMIN to deactivate a user', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/user-2/deactivate')
      .set('x-test-role', Role.ADMIN);

    expect(res.status).toBe(200);
    expect(setActive).toHaveBeenCalledWith('user-2', false);
  });

  it('rejects HR_STAFF from deactivating a user (403, service never called)', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/user-2/deactivate')
      .set('x-test-role', Role.HR_STAFF);

    expect(res.status).toBe(403);
    expect(setActive).not.toHaveBeenCalled();
  });

  it('allows ADMIN to reactivate a user', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/user-2/reactivate')
      .set('x-test-role', Role.ADMIN);

    expect(res.status).toBe(200);
    expect(setActive).toHaveBeenCalledWith('user-2', true);
  });

  it('rejects HR_STAFF from reactivating a user (403, service never called)', async () => {
    const res = await request(app.getHttpServer())
      .patch('/users/user-2/reactivate')
      .set('x-test-role', Role.HR_STAFF);

    expect(res.status).toBe(403);
    expect(setActive).not.toHaveBeenCalled();
  });
});
