import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { OvertimeLettersService } from './overtime-letters.service';
import { CreateOvertimeLetterDto } from './dto/create-overtime-letter.dto';
import { UpdateOvertimeLetterDto } from './dto/update-overtime-letter.dto';

@Controller('overtime-letters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class OvertimeLettersController {
  constructor(
    private readonly overtimeLettersService: OvertimeLettersService,
  ) {}

  @Get()
  list(@Query('employeeId') employeeId?: string) {
    return this.overtimeLettersService.list(employeeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.overtimeLettersService.findByIdOrThrow(id);
  }

  // 404 (not "not verified") if the background job hasn't finished — the
  // client is expected to poll after verifying.
  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string): Promise<StreamableFile> {
    const record = await this.overtimeLettersService.findByIdOrThrow(id);
    if (!record.pdfPath) {
      throw new NotFoundException(
        `PDF for overtime letter ${id} is not ready yet (still generating or not verified)`,
      );
    }
    const absolutePath = path.join(process.cwd(), record.pdfPath);
    const stream = fs.createReadStream(absolutePath);
    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="overtime-letter-${id}.pdf"`,
    });
  }

  @Post()
  create(@Body() dto: CreateOvertimeLetterDto) {
    return this.overtimeLettersService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateOvertimeLetterDto) {
    return this.overtimeLettersService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.overtimeLettersService.remove(id);
  }

  @Put(':id/verify')
  verify(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.overtimeLettersService.verify(id, user.id);
  }

  @Put(':id/reject')
  reject(@Param('id') id: string) {
    return this.overtimeLettersService.reject(id);
  }
}
