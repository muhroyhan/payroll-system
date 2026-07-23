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
import { SuratPeringatanService } from './surat-peringatan.service';
import { CreateSuratPeringatanDto } from './dto/create-surat-peringatan.dto';
import { UpdateSuratPeringatanDto } from './dto/update-surat-peringatan.dto';

@Controller('surat-peringatan')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class SuratPeringatanController {
  constructor(
    private readonly suratPeringatanService: SuratPeringatanService,
  ) {}

  @Get()
  list(@Query('employeeId') employeeId?: string) {
    return this.suratPeringatanService.list(employeeId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.suratPeringatanService.findByIdOrThrow(id);
  }

  // 404 (not "not issued yet") if the background job hasn't finished — the
  // client is expected to poll briefly after creation.
  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string): Promise<StreamableFile> {
    const record = await this.suratPeringatanService.findByIdOrThrow(id);
    if (!record.pdfPath) {
      throw new NotFoundException(
        `PDF for surat peringatan ${id} is not ready yet (still generating)`,
      );
    }
    const absolutePath = path.join(process.cwd(), record.pdfPath);
    const stream = fs.createReadStream(absolutePath);
    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="surat-peringatan-${id}.pdf"`,
    });
  }

  @Post()
  create(@Body() dto: CreateSuratPeringatanDto) {
    return this.suratPeringatanService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSuratPeringatanDto) {
    return this.suratPeringatanService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.suratPeringatanService.remove(id);
  }
}
