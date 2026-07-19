import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { PayslipComponent } from './entities/payslip-component.entity';
import { CreatePayslipComponentDto } from './dto/create-payslip-component.dto';
import { UpdatePayslipComponentDto } from './dto/update-payslip-component.dto';

@Injectable()
export class PayslipComponentsService {
  constructor(
    @InjectModel(PayslipComponent)
    private readonly payslipComponentModel: typeof PayslipComponent,
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
    try {
      return await record.update(dto);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  // No remove()/delete endpoint — payslip_component_master is never hard-deleted (§11).
  // Retiring a component means ceasing to reference it going forward.

  private translateUniqueConstraintError(error: unknown): unknown {
    if (error instanceof UniqueConstraintError) {
      return new ConflictException(
        'A payslip component with this name already exists',
      );
    }
    return error;
  }
}
