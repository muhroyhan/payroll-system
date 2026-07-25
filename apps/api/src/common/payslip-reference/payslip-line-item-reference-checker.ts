import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { PayslipLineItem } from '../../modules/payslips/entities/payslip-line-item.entity';
import {
  PayslipReferenceChecker,
  PayslipReferenceSource,
} from './payslip-reference-checker.interface';

// P8-T04 — the REAL PayslipReferenceChecker, replacing NoPayslipReferenceChecker
// now that payslip_line_items exists. A sanction / overtime record is "locked"
// once any payslip line item cites it by (source, source_id). Same lock the
// surat_peringatan (P4-T02) and overtime_letter (P4-T03) services already guard
// against — this just makes the check real.
@Injectable()
export class PayslipLineItemReferenceChecker implements PayslipReferenceChecker {
  constructor(
    @InjectModel(PayslipLineItem)
    private readonly lineItemModel: typeof PayslipLineItem,
  ) {}

  async isReferencedByPayslip(
    source: PayslipReferenceSource,
    sourceId: string,
  ): Promise<boolean> {
    const count = await this.lineItemModel.count({
      where: { source, sourceId },
    });
    return count > 0;
  }
}
