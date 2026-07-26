import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PayslipsService } from './payslips.service';

// §5.8 — payslips are CRU only (never delete). Read surface here; the full
// summary report is P8-T06.
@Controller('payslips')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class PayslipsController {
  constructor(private readonly payslipsService: PayslipsService) {}

  @Get()
  list(@Query('payrollRunId') payrollRunId?: string) {
    return this.payslipsService.list(payrollRunId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payslipsService.findByIdOrThrow(id);
  }

  // B-05 — mirrors the letters' GET :id/pdf (e.g. surat-ijin.controller.ts):
  // pdf_path is a server filesystem path (P8-T05's pdf-generation.processor
  // writes it), never a URL, so it must be streamed through this route
  // rather than exposed to the browser directly.
  @Get(':id/pdf')
  async downloadPdf(@Param('id') id: string): Promise<StreamableFile> {
    const record = await this.payslipsService.findByIdOrThrow(id);
    if (!record.pdfPath) {
      throw new NotFoundException(
        `PDF for payslip ${id} is not ready yet (still generating)`,
      );
    }
    const absolutePath = path.join(process.cwd(), record.pdfPath);
    const stream = fs.createReadStream(absolutePath);
    return new StreamableFile(stream, {
      type: 'application/pdf',
      disposition: `attachment; filename="payslip-${id}.pdf"`,
    });
  }
}
