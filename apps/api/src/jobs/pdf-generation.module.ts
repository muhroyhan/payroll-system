import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SequelizeModule } from '@nestjs/sequelize';
import { UsersModule } from '../modules/users/users.module';
import { SuratIjin } from '../modules/letters/surat-ijin/entities/surat-ijin.entity';
import { SuratPeringatan } from '../modules/letters/surat-peringatan/entities/surat-peringatan.entity';
import { OvertimeLetter } from '../modules/letters/overtime-letters/entities/overtime-letter.entity';
import { PdfRendererService } from './pdf-renderer.service';
import {
  PdfGenerationQueue,
  PDF_GENERATION_QUEUE,
} from './pdf-generation.queue';
import { PdfGenerationProcessor } from './pdf-generation.processor';

// §2.2/§3 — the one shared PDF generation queue AND worker. Modules that need
// a letter or payslip rendered import THIS module and call
// PdfGenerationQueue; they never spin up a second queue, a second
// @Processor on this same queue, or generate PDFs inline. New document types
// add a job-name case to PdfGenerationProcessor instead.
@Module({
  imports: [
    BullModule.registerQueue({ name: PDF_GENERATION_QUEUE }),
    SequelizeModule.forFeature([SuratIjin, SuratPeringatan, OvertimeLetter]),
    UsersModule,
  ],
  providers: [PdfRendererService, PdfGenerationQueue, PdfGenerationProcessor],
  exports: [PdfGenerationQueue],
})
export class PdfGenerationModule {}
