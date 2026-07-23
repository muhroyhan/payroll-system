import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PdfGenerationModule } from '../../../jobs/pdf-generation.module';
import { PayslipReferenceModule } from '../../../common/payslip-reference/payslip-reference.module';
import { OvertimeLetter } from './entities/overtime-letter.entity';
import { OvertimeLettersService } from './overtime-letters.service';
import { OvertimeLettersController } from './overtime-letters.controller';

@Module({
  imports: [
    SequelizeModule.forFeature([OvertimeLetter]),
    PdfGenerationModule,
    PayslipReferenceModule,
  ],
  controllers: [OvertimeLettersController],
  providers: [OvertimeLettersService],
  exports: [OvertimeLettersService],
})
export class OvertimeLettersModule {}
