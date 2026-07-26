import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SPREADSHEET_MULTER_OPTIONS } from '../../common/bulk-import/spreadsheet-file-validation';
import { EmployeesService } from './employees.service';
import { EmployeesImportService } from './employees-import.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Controller('employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class EmployeesController {
  constructor(
    private readonly employeesService: EmployeesService,
    private readonly employeesImportService: EmployeesImportService,
  ) {}

  @Get()
  list() {
    return this.employeesService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.employeesService.findByIdOrThrow(id);
  }

  @Post()
  create(@Body() dto: CreateEmployeeDto) {
    return this.employeesService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employeesService.update(id, dto);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file', SPREADSHEET_MULTER_OPTIONS))
  importFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded (expected multipart field "file")',
      );
    }
    return this.employeesImportService.importFromBuffer(file.buffer);
  }
}
