import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as XLSX from 'xlsx';
import { AttendanceRawLogsService } from './attendance-raw-logs.service';
import { ImportAttendanceRawLogRowDto } from './dto/import-attendance-raw-log-row.dto';
import {
  BulkImportResult,
  ImportRowError,
} from '../../common/bulk-import/bulk-import-result';

const HEADER_ROW_OFFSET = 2;

@Injectable()
export class AttendanceRawLogsImportService {
  constructor(
    private readonly attendanceRawLogsService: AttendanceRawLogsService,
  ) {}

  async importFromBuffer(buffer: Buffer): Promise<BulkImportResult> {
    const rows = this.parseRows(buffer);
    if (rows.length === 0) {
      throw new BadRequestException('The uploaded file contains no data rows');
    }

    const errors: ImportRowError[] = [];
    const validRows: ImportAttendanceRawLogRowDto[] = [];

    for (const [index, rawRow] of rows.entries()) {
      const rowNumber = index + HEADER_ROW_OFFSET;
      const rowDto = plainToInstance(ImportAttendanceRawLogRowDto, rawRow);
      const validationErrors = await validate(rowDto, {
        whitelist: true,
        forbidNonWhitelisted: false,
      });

      if (validationErrors.length > 0) {
        errors.push({
          row: rowNumber,
          messages: validationErrors.flatMap((e) =>
            Object.values(e.constraints ?? {}),
          ),
        });
        continue;
      }
      validRows.push(rowDto);
    }

    const created =
      validRows.length > 0
        ? await this.attendanceRawLogsService.bulkCreate(validRows)
        : [];

    return {
      totalRows: rows.length,
      successCount: created.length,
      failureCount: errors.length,
      createdIds: created.map((r) => r.id),
      errors,
    };
  }

  private parseRows(buffer: Buffer): Record<string, unknown>[] {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, {
        type: 'buffer',
        raw: true,
        cellDates: false,
      });
    } catch {
      throw new BadRequestException(
        'Could not parse the uploaded file as CSV or Excel',
      );
    }

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new BadRequestException('The uploaded file has no sheets');
    }

    const sheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: true,
    });
  }
}
