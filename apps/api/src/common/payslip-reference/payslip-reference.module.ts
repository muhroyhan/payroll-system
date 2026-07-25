import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PayslipLineItem } from '../../modules/payslips/entities/payslip-line-item.entity';
import { PAYSLIP_REFERENCE_CHECKER } from './payslip-reference-checker.interface';
import { PayslipLineItemReferenceChecker } from './payslip-line-item-reference-checker';

// Shared by every letter type that can be pulled into a payslip_line_item
// (surat_peringatan, overtime_letter) — one swap point for both consumers.
// P8-T04 swapped the NoPayslipReferenceChecker stub for the real
// payslip_line_items-backed checker now that the table exists.
@Module({
  imports: [SequelizeModule.forFeature([PayslipLineItem])],
  providers: [
    {
      provide: PAYSLIP_REFERENCE_CHECKER,
      useClass: PayslipLineItemReferenceChecker,
    },
  ],
  exports: [PAYSLIP_REFERENCE_CHECKER],
})
export class PayslipReferenceModule {}
