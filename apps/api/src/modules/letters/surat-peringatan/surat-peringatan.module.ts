import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PdfGenerationModule } from '../../../jobs/pdf-generation.module';
import { PayslipReferenceModule } from '../../../common/payslip-reference/payslip-reference.module';
import { SuratPeringatan } from './entities/surat-peringatan.entity';
import { SuratPeringatanService } from './surat-peringatan.service';
import { SuratPeringatanController } from './surat-peringatan.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([SuratPeringatan]),
    PdfGenerationModule,
    PayslipReferenceModule,
  ],
  controllers: [SuratPeringatanController],
  providers: [SuratPeringatanService],
  exports: [SuratPeringatanService],
})
export class SuratPeringatanModule {}
