import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
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
import { AttendanceRawLogsService } from './attendance-raw-logs.service';
import { AttendanceRawLogsImportService } from './attendance-raw-logs-import.service';
import { CreateAttendanceRawLogDto } from './dto/create-attendance-raw-log.dto';
import { BulkCreateAttendanceRawLogsDto } from './dto/bulk-create-attendance-raw-logs.dto';

@Controller('attendance-raw-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class AttendanceRawLogsController {
  constructor(
    private readonly attendanceRawLogsService: AttendanceRawLogsService,
    private readonly attendanceRawLogsImportService: AttendanceRawLogsImportService,
  ) {}

  @Get()
  list(
    @Query('deviceUserId') deviceUserId?: string,
    @Query('deviceId') deviceId?: string,
  ) {
    return this.attendanceRawLogsService.list(deviceUserId, deviceId);
  }

  // API-pull path: an external script/cron pushes a batch it pulled from the
  // device's own export mechanism.
  @Post('bulk')
  bulkCreate(@Body() dto: BulkCreateAttendanceRawLogsDto) {
    return this.attendanceRawLogsService.bulkCreate(dto.logs);
  }

  // File-pull path: a CSV/Excel export of the device's scan log.
  @Post('import')
  @UseInterceptors(FileInterceptor('file', SPREADSHEET_MULTER_OPTIONS))
  importFile(@UploadedFile() file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException(
        'No file uploaded (expected multipart field "file")',
      );
    }
    return this.attendanceRawLogsImportService.importFromBuffer(file.buffer);
  }

  @Post()
  create(@Body() dto: CreateAttendanceRawLogDto) {
    return this.attendanceRawLogsService.create(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendanceRawLogsService.remove(id);
  }
}
