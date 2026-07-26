import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { EmployeesImportService } from './employees-import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// Audit fix — POST /employees/import previously accepted any file of any
// size (FileInterceptor('file') with no limits/fileFilter). This proves the
// fix end-to-end over real HTTP: oversize and wrong-extension uploads must
// come back as a clean 4xx (never a raw/unhandled 500), and a valid file
// must still reach EmployeesImportService exactly as before.
describe('EmployeesController — import file validation (audit fix)', () => {
  let app: INestApplication<App>;
  let importFromBuffer: jest.Mock;

  beforeEach(async () => {
    importFromBuffer = jest.fn().mockResolvedValue({
      totalRows: 1,
      successCount: 1,
      failureCount: 0,
      createdIds: ['emp-1'],
      errors: [],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EmployeesController],
      providers: [
        { provide: EmployeesService, useValue: {} },
        { provide: EmployeesImportService, useValue: { importFromBuffer } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts a valid small .csv file and forwards it to EmployeesImportService unchanged', async () => {
    const res = await request(app.getHttpServer())
      .post('/employees/import')
      .attach('file', Buffer.from('name,nik\nBudi,123\n'), {
        filename: 'employees.csv',
        contentType: 'text/csv',
      });

    expect(res.status).toBe(201);
    expect(importFromBuffer).toHaveBeenCalledTimes(1);
    expect(res.body).toEqual({
      totalRows: 1,
      successCount: 1,
      failureCount: 0,
      createdIds: ['emp-1'],
      errors: [],
    });
  });

  it('rejects a file over the 10 MB limit with a clean 413, not a raw/unhandled 500', async () => {
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 'a');

    const res = await request(app.getHttpServer())
      .post('/employees/import')
      .attach('file', oversized, {
        filename: 'employees.csv',
        contentType: 'text/csv',
      });

    expect(res.status).toBe(413);
    expect(res.body.message).not.toMatch(/at .*\(.*:\d+:\d+\)/); // no stack trace leaked
    expect(importFromBuffer).not.toHaveBeenCalled();
  });

  it('rejects a wrong-extension file with a clean 400, not a raw/unhandled 500', async () => {
    const res = await request(app.getHttpServer())
      .post('/employees/import')
      .attach('file', Buffer.from('not a spreadsheet'), {
        filename: 'employees.exe',
        contentType: 'application/x-msdownload',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('.exe');
    expect(importFromBuffer).not.toHaveBeenCalled();
  });
});
