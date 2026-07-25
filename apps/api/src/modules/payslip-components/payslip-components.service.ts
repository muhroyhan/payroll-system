import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { PayslipComponent } from './entities/payslip-component.entity';
import { PayslipLineItem } from '../payslips/entities/payslip-line-item.entity';
import { CreatePayslipComponentDto } from './dto/create-payslip-component.dto';
import { UpdatePayslipComponentDto } from './dto/update-payslip-component.dto';

@Injectable()
export class PayslipComponentsService {
  constructor(
    @InjectModel(PayslipComponent)
    private readonly payslipComponentModel: typeof PayslipComponent,
    @InjectModel(PayslipLineItem)
    private readonly payslipLineItemModel: typeof PayslipLineItem,
  ) {}

  list(): Promise<PayslipComponent[]> {
    return this.payslipComponentModel.findAll();
  }

  async findByIdOrThrow(id: string): Promise<PayslipComponent> {
    const record = await this.payslipComponentModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Payslip component ${id} not found`);
    }
    return record;
  }

  async create(dto: CreatePayslipComponentDto): Promise<PayslipComponent> {
    try {
      return await this.payslipComponentModel.create(dto as any);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async update(
    id: string,
    dto: UpdatePayslipComponentDto,
  ): Promise<PayslipComponent> {
    const record = await this.findByIdOrThrow(id);
    await this.assertMutableFieldsUntouched(record, dto);
    try {
      return await record.update(dto);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  // No remove()/delete endpoint — payslip_component_master is never hard-deleted (§11).
  // Retiring a component means ceasing to reference it going forward.

  // §11/P8-T07 — componentType/isTaxable/isBpjsEligible become immutable once
  // this component has been referenced by an existing payslip_line_items row
  // (payslip_line_items.component_id, populated for temp_component/sanction
  // lines — §5.8) — changing them retroactively would make a historical
  // payslip inconsistent with how it was actually taxed. `name` is NOT
  // locked by this guard; only queries payslip_line_items at all if one of
  // the three locked fields is actually being touched, same pattern as
  // KasbonService.assertLockedFieldsUntouched.
  private async assertMutableFieldsUntouched(
    record: PayslipComponent,
    dto: UpdatePayslipComponentDto,
  ): Promise<void> {
    const lockedFields: Array<keyof UpdatePayslipComponentDto> = [
      'componentType',
      'isTaxable',
      'isBpjsEligible',
    ];
    const touched = lockedFields.find((field) => dto[field] !== undefined);
    if (!touched) {
      return;
    }

    const referencedCount = await this.payslipLineItemModel.count({
      where: { componentId: record.id },
    });
    if (referencedCount > 0) {
      throw new ConflictException(
        `Payslip component ${record.id}'s ${touched} is locked — it has already ` +
          `been referenced by a payslip line item (§11/P8-T07); changing ` +
          `componentType/isTaxable/isBpjsEligible on a used component would make ` +
          `historical payslips inconsistent with how they were actually taxed`,
      );
    }
  }

  private translateUniqueConstraintError(error: unknown): unknown {
    if (error instanceof UniqueConstraintError) {
      return new ConflictException(
        'A payslip component with this name already exists',
      );
    }
    return error;
  }
}
