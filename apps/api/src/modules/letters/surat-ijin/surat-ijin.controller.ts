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
import { SuratIjinService } from './surat-ijin.service';
import { CreateSuratIjinDto } from './dto/create-surat-ijin.dto';
import { UpdateSuratIjinDto } from './dto/update-surat-ijin.dto';

@Controller('surat-ijin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class SuratIjinController {
  constructor(private readonly suratIjinService: SuratIjinService) {}

  @Get()
  list(@Query('employeeId') employeeId?: string) {
    return this.suratIjinService.list(employeeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suratIjinService.findByIdOrThrow(id);
  }

  // Downloads the generated PDF. 404 (not "pending") if the approval job
  // hasn't finished yet — the client is expected to poll after approving.
  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string): Promise<StreamableFile> {
    const record = await this.suratIjinService.findByIdOrThrow(id);
    if (!record.pdfPath) {
      throw new NotFoundException(
        `PDF for surat ijin ${id} is not ready yet (still generating or not approved)`,
      );
    }
    const absolutePath = path.join(process.cwd(), record.pdfPath);
    const stream = fs.createReadStream(absolutePath);
    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="surat-ijin-${id}.pdf"`,
    });
  }

  @Post()
  create(@Body() dto: CreateSuratIjinDto) {
    return this.suratIjinService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSuratIjinDto) {
    return this.suratIjinService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suratIjinService.remove(id);
  }

  @Put(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.suratIjinService.approve(id, user.id);
  }

  @Put(':id/reject')
  reject(@Param('id') id: string) {
    return this.suratIjinService.reject(id);
  }
}
