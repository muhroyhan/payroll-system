import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op, Transaction } from 'sequelize';
import { Payslip } from '../payslips/entities/payslip.entity';
import { PayslipLineItem } from '../payslips/entities/payslip-line-item.entity';
import { KasbonService } from '../kasbon/kasbon.service';

export interface RevertRunTeardown {
  deletedPayslips: number;
  deletedLineItems: number;
  reversedKasbonDeductions: number;
}

// P8-T07 — the teardown half of revert-to-draft (§11). When a `calculated` run
// goes back to draft, its provisional payslips + line items are thrown away
// (they'll be regenerated from corrected inputs on recalc), and the kasbon
// installments they drew are rolled back.
//
// Deliberate asymmetry in what gets rolled back:
//   • kasbon_deductions ARE reversed explicitly — deductInstallment mutated
//     real state (remaining_balance, paid_off), so deleting the payslip alone
//     would leave a phantom deduction with no backing payslip.
//   • surat_peringatan / overtime_letter are NOT touched — the calculation
//     never mutated them, it only cited them by source_id. Their "locked"
//     state is derived from the payslip_line_items reference count, so deleting
//     the line items below auto-releases them (count → 0). Nothing else to do.
@Injectable()
export class PayrollRunRevertService {
  constructor(
    @InjectModel(Payslip) private readonly payslipModel: typeof Payslip,
    @InjectModel(PayslipLineItem)
    private readonly lineItemModel: typeof PayslipLineItem,
    private readonly kasbonService: KasbonService,
  ) {}

  async revertRunData(
    payrollRunId: string,
    transaction: Transaction,
  ): Promise<RevertRunTeardown> {
    const payslips = await this.payslipModel.findAll({
      where: { payrollRunId },
      attributes: ['id'],
      transaction,
    });
    const payslipIds = payslips.map((p) => p.id);

    let deletedLineItems = 0;
    let deletedPayslips = 0;
    if (payslipIds.length > 0) {
      deletedLineItems = await this.lineItemModel.destroy({
        where: { payslipId: { [Op.in]: payslipIds } },
        transaction,
      });
      deletedPayslips = await this.payslipModel.destroy({
        where: { id: { [Op.in]: payslipIds } },
        transaction,
      });
    }

    const reversedKasbonDeductions =
      await this.kasbonService.reverseInstallmentsForRun(
        payrollRunId,
        transaction,
      );

    return { deletedPayslips, deletedLineItems, reversedKasbonDeductions };
  }
}
