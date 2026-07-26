import { BadRequestException, Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as XLSX from 'xlsx';
import type { Role } from '@payroll-system/shared-types';
import { EmployeeTypesService } from '../organization/employee-types/employee-types.service';
import { PositionsService } from '../organization/positions/positions.service';
import { DepartmentsService } from '../organization/departments/departments.service';
import { DivisionsService } from '../organization/divisions/divisions.service';
import { EmployeesService } from './employees.service';
import { ImportEmployeeRowDto } from './dto/import-employee-row.dto';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import {
  BulkImportResult,
  ImportRowError,
} from '../../common/bulk-import/bulk-import-result';

const HEADER_ROW_OFFSET = 2; // header row (1) + 1-based row numbering

@Injectable()
export class EmployeesImportService {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly employeeTypesService: EmployeeTypesService,
    private readonly positionsService: PositionsService,
    private readonly departmentsService: DepartmentsService,
    private readonly divisionsService: DivisionsService,
  ) {}

  async importFromBuffer(
    buffer: Buffer,
    currentUserId: string,
    actorRole: Role,
  ): Promise<BulkImportResult> {
    const rows = this.parseRows(buffer);
    if (rows.length === 0) {
      throw new BadRequestException('The uploaded file contains no data rows');
    }

    const [employeeTypes, positions, departments, divisions] =
      await Promise.all([
        this.employeeTypesService.list(),
        this.positionsService.list(),
        this.departmentsService.list(),
        this.divisionsService.list(),
      ]);

    const employeeTypeMap = this.byLowercaseName(employeeTypes);
    const positionMap = this.byLowercaseName(positions);
    const departmentMap = this.byLowercaseName(departments);
    const divisionMap = this.byLowercaseName(divisions);

    const errors: ImportRowError[] = [];
    const createdIds: string[] = [];

    for (const [index, rawRow] of rows.entries()) {
      const rowNumber = index + HEADER_ROW_OFFSET;
      const rowDto = plainToInstance(ImportEmployeeRowDto, rawRow);
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

      const employeeTypeId = employeeTypeMap.get(
        rowDto.employeeType.toLowerCase(),
      );
      const positionId = positionMap.get(rowDto.position.toLowerCase());
      const departmentId = departmentMap.get(rowDto.department.toLowerCase());
      const divisionId = divisionMap.get(rowDto.division.toLowerCase());

      const unresolved: string[] = [];
      if (!employeeTypeId)
        unresolved.push(`Unknown employeeType "${rowDto.employeeType}"`);
      if (!positionId) unresolved.push(`Unknown position "${rowDto.position}"`);
      if (!departmentId)
        unresolved.push(`Unknown department "${rowDto.department}"`);
      if (!divisionId) unresolved.push(`Unknown division "${rowDto.division}"`);

      if (unresolved.length > 0) {
        errors.push({ row: rowNumber, messages: unresolved });
        continue;
      }

      const createDto: CreateEmployeeDto = {
        name: rowDto.name,
        nik: rowDto.nik,
        npwp: rowDto.npwp,
        ptkpStatus: rowDto.ptkpStatus,
        maritalStatus: rowDto.maritalStatus,
        gender: rowDto.gender,
        dependentCount: rowDto.dependentCount,
        wifeIncomeCombined: rowDto.wifeIncomeCombined,
        spouseNoIncomeCertificate: rowDto.spouseNoIncomeCertificate,
        ptkpManuallyOverridden: rowDto.ptkpManuallyOverridden,
        ptkpOverrideReason: rowDto.ptkpOverrideReason,
        employmentStatus: rowDto.employmentStatus,
        employeeTypeId: employeeTypeId as string,
        positionId: positionId as string,
        departmentId: departmentId as string,
        divisionId: divisionId as string,
        location: rowDto.location,
        bankName: rowDto.bankName,
        bankAccountNumber: rowDto.bankAccountNumber,
        bankAccountHolderName: rowDto.bankAccountHolderName,
        startDate: rowDto.startDate,
        endDate: rowDto.endDate,
        status: rowDto.status,
      };

      try {
        const created = await this.employeesService.create(
          createDto,
          currentUserId,
          actorRole,
        );
        createdIds.push(created.id);
      } catch (error) {
        errors.push({
          row: rowNumber,
          messages: [
            error instanceof Error
              ? error.message
              : 'Unknown error creating employee',
          ],
        });
      }
    }

    return {
      totalRows: rows.length,
      successCount: createdIds.length,
      failureCount: errors.length,
      createdIds,
      errors,
    };
  }

  private parseRows(buffer: Buffer): Record<string, unknown>[] {
    let workbook: XLSX.WorkBook;
    try {
      // raw + cellDates:false stop xlsx from auto-coercing number/date-looking
      // text (NIK, startDate) into JS numbers or reformatted date strings.
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

  private byLowercaseName(
    records: { id: string; name: string }[],
  ): Map<string, string> {
    return new Map(records.map((r) => [r.name.toLowerCase(), r.id]));
  }
}
