import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { SalaryPeriodConfig } from './entities/salary-period-config.entity';
import { UpsertSalaryPeriodConfigDto } from './dto/upsert-salary-period-config.dto';

@Injectable()
export class SalaryPeriodConfigService {
  constructor(
    @InjectModel(SalaryPeriodConfig)
    private readonly salaryPeriodConfigModel: typeof SalaryPeriodConfig,
  ) {}

  async get(): Promise<SalaryPeriodConfig> {
    const record = await this.salaryPeriodConfigModel.findOne();
    if (!record) {
      throw new NotFoundException(
        'Salary period config has not been set yet — configure it via PUT first',
      );
    }
    return record;
  }

  async upsert(
    dto: UpsertSalaryPeriodConfigDto,
    updatedBy: string,
  ): Promise<SalaryPeriodConfig> {
    const existing = await this.salaryPeriodConfigModel.findOne();
    if (existing) {
      return existing.update({ ...dto, updatedBy });
    }
    return this.salaryPeriodConfigModel.create({ ...dto, updatedBy } as any);
  }
}
