import { BadRequestException } from '@nestjs/common';
import {
  SPREADSHEET_MAX_FILE_SIZE_BYTES,
  SPREADSHEET_MULTER_OPTIONS,
  spreadsheetFileFilter,
} from './spreadsheet-file-validation';

describe('spreadsheetFileFilter', () => {
  function file(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
    return {
      originalname: 'employees.xlsx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ...overrides,
    } as Express.Multer.File;
  }

  function run(f: Express.Multer.File) {
    return new Promise<{ error: Error | null; accepted: boolean }>((resolve) => {
      spreadsheetFileFilter({}, f, (error, accepted) =>
        resolve({ error, accepted }),
      );
    });
  }

  it.each([
    ['employees.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['employees.xls', 'application/vnd.ms-excel'],
    ['employees.csv', 'text/csv'],
    // Common real-world quirk: browsers/OSes often report CSV/Excel uploads
    // as the generic binary fallback instead of a specific spreadsheet type.
    ['employees.csv', 'application/octet-stream'],
    ['employees.xlsx', 'application/octet-stream'],
  ])('accepts a valid %s upload reporting mimetype %s', async (name, mimetype) => {
    const { error, accepted } = await run(file({ originalname: name, mimetype }));
    expect(error).toBeNull();
    expect(accepted).toBe(true);
  });

  it.each([
    ['employees.txt', 'text/plain'],
    ['employees.pdf', 'application/pdf'],
    ['employees.exe', 'application/x-msdownload'],
    ['employees', ''], // no extension at all
    ['employees.json', 'application/json'],
  ])('rejects %s with a 400 BadRequestException (not a raw/unhandled error)', async (name) => {
    const { error, accepted } = await run(file({ originalname: name }));
    expect(accepted).toBe(false);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).getStatus()).toBe(400);
  });

  it('rejects a spoofed extension whose mimetype is obviously wrong for it', async () => {
    // .xlsx extension but an image mimetype — extension alone would pass;
    // the mimetype check is the second line of defense.
    const { error, accepted } = await run(
      file({ originalname: 'malware.xlsx', mimetype: 'image/png' }),
    );
    expect(accepted).toBe(false);
    expect(error).toBeInstanceOf(BadRequestException);
  });

  it('extension check is case-insensitive', async () => {
    const { error, accepted } = await run(
      file({ originalname: 'EMPLOYEES.XLSX' }),
    );
    expect(error).toBeNull();
    expect(accepted).toBe(true);
  });

  it('error messages do not leak a stack trace or internal details, just a clear reason', async () => {
    const { error } = await run(file({ originalname: 'bad.exe' }));
    const message = (error as BadRequestException).message;
    expect(message).toContain('.exe');
    expect(message).not.toContain('at ');
    expect(message).not.toContain('node_modules');
  });
});

describe('SPREADSHEET_MULTER_OPTIONS', () => {
  it('caps file size at 10 MB and wires the shared fileFilter', () => {
    expect(SPREADSHEET_MULTER_OPTIONS.limits.fileSize).toBe(
      SPREADSHEET_MAX_FILE_SIZE_BYTES,
    );
    expect(SPREADSHEET_MAX_FILE_SIZE_BYTES).toBe(10 * 1024 * 1024);
    expect(SPREADSHEET_MULTER_OPTIONS.fileFilter).toBe(spreadsheetFileFilter);
  });
});
