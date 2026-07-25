import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Payslip } from './entities/payslip.entity';

@Injectable()
export class PayslipsService {
  constructor(
    @InjectModel(Payslip) private readonly payslipModel: typeof Payslip,
  ) {}

  list(payrollRunId?: string): Promise<Payslip[]> {
    const where: Record<string, unknown> = {};
    if (payrollRunId) where.payrollRunId = payrollRunId;
    return this.payslipModel.findAll({ where, include: ['employee'] });
  }

  async findByIdOrThrow(id: string): Promise<Payslip> {
    const record = await this.payslipModel.findByPk(id, {
      include: ['employee', 'lineItems'],
    });
    if (!record) {
      throw new NotFoundException(`Payslip ${id} not found`);
    }
    return record;
  }
}
