import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AttendanceRawLogsController } from './attendance-raw-logs.controller';
import { AttendanceRawLogsService } from './attendance-raw-logs.service';
import { AttendanceRawLogsImportService } from './attendance-raw-logs-import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

// Audit fix — POST /attendance-raw-logs/import had the exact same gap as
// employees/import (see employees.controller.spec.ts): no limits/fileFilter
// on FileInterceptor('file'). Same shared SPREADSHEET_MULTER_OPTIONS, so this
// proves the fix applies here too, not just on one of the two endpoints.
describe('AttendanceRawLogsController — import file validation (audit fix)', () => {
  let app: INestApplication<App>;
  let importFromBuffer: jest.Mock;

  beforeEach(async () => {
    importFromBuffer = jest.fn().mockResolvedValue({
      totalRows: 1,
      successCount: 1,
      failureCount: 0,
      createdIds: ['log-1'],
      errors: [],
    });

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AttendanceRawLogsController],
      providers: [
        { provide: AttendanceRawLogsService, useValue: {} },
        {
          provide: AttendanceRawLogsImportService,
          useValue: { importFromBuffer },
        },
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

  it('accepts a valid small .xlsx-labelled file and forwards it to AttendanceRawLogsImportService unchanged', async () => {
    const res = await request(app.getHttpServer())
      .post('/attendance-raw-logs/import')
      .attach('file', Buffer.from('deviceUserId,deviceId\n007,dev-1\n'), {
        filename: 'raw-logs.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

    expect(res.status).toBe(201);
    expect(importFromBuffer).toHaveBeenCalledTimes(1);
    expect(res.body.createdIds).toEqual(['log-1']);
  });

  it('rejects a file over the 10 MB limit with a clean 413, not a raw/unhandled 500', async () => {
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1, 'a');

    const res = await request(app.getHttpServer())
      .post('/attendance-raw-logs/import')
      .attach('file', oversized, {
        filename: 'raw-logs.csv',
        contentType: 'text/csv',
      });

    expect(res.status).toBe(413);
    expect(importFromBuffer).not.toHaveBeenCalled();
  });

  it('rejects a wrong-extension file with a clean 400, not a raw/unhandled 500', async () => {
    const res = await request(app.getHttpServer())
      .post('/attendance-raw-logs/import')
      .attach('file', Buffer.from('<html></html>'), {
        filename: 'raw-logs.html',
        contentType: 'text/html',
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('.html');
    expect(importFromBuffer).not.toHaveBeenCalled();
  });
});
