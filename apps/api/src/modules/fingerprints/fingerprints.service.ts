import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { UniqueConstraintError } from 'sequelize';
import { Fingerprint } from './entities/fingerprint.entity';
import { CreateFingerprintDto } from './dto/create-fingerprint.dto';
import { UpdateFingerprintDto } from './dto/update-fingerprint.dto';

@Injectable()
export class FingerprintsService {
  constructor(
    @InjectModel(Fingerprint)
    private readonly fingerprintModel: typeof Fingerprint,
  ) {}

  list(): Promise<Fingerprint[]> {
    // BUGS#3 — newest-updated first, the default for every listing.
    return this.fingerprintModel.findAll({
      include: ['employee'],
      order: [['updatedAt', 'DESC']],
    });
  }

  async findByIdOrThrow(id: string): Promise<Fingerprint> {
    const record = await this.fingerprintModel.findByPk(id, {
      include: ['employee'],
    });
    if (!record) {
      throw new NotFoundException(`Fingerprint ${id} not found`);
    }
    return record;
  }

  // Used by reconciliation to map a raw scan's (deviceUserId, deviceId) back to an employee.
  findByDevice(
    deviceUserId: string,
    deviceId: string,
  ): Promise<Fingerprint | null> {
    return this.fingerprintModel.findOne({ where: { deviceUserId, deviceId } });
  }

  async create(dto: CreateFingerprintDto): Promise<Fingerprint> {
    try {
      return await this.fingerprintModel.create(dto as any);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async update(id: string, dto: UpdateFingerprintDto): Promise<Fingerprint> {
    const record = await this.findByIdOrThrow(id);
    try {
      return await record.update(dto);
    } catch (error) {
      throw this.translateUniqueConstraintError(error);
    }
  }

  async remove(id: string): Promise<void> {
    const record = await this.findByIdOrThrow(id);
    await record.destroy();
  }

  private translateUniqueConstraintError(error: unknown): unknown {
    if (error instanceof UniqueConstraintError) {
      return new ConflictException(
        'This device_user_id + device_id pair is already enrolled to another employee',
      );
    }
    return error;
  }
}
