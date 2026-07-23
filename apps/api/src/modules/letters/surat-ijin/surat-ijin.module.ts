import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PdfGenerationModule } from '../../../jobs/pdf-generation.module';
import { SuratIjin } from './entities/surat-ijin.entity';
import { SuratIjinService } from './surat-ijin.service';
import { SuratIjinController } from './surat-ijin.controller';
import { SuratIjinPermissionResolver } from './surat-ijin-permission-resolver.service';

@Module({
  imports: [SequelizeModule.forFeature([SuratIjin]), PdfGenerationModule],
  controllers: [SuratIjinController],
  providers: [SuratIjinService, SuratIjinPermissionResolver],
  exports: [SuratIjinService, SuratIjinPermissionResolver],
})
export class SuratIjinModule {}
