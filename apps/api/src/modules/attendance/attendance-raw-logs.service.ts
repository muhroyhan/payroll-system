import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { AttendanceRawLog } from './entities/attendance-raw-log.entity';
import { CreateAttendanceRawLogDto } from './dto/create-attendance-raw-log.dto';

@Injectable()
export class AttendanceRawLogsService {
  constructor(
    @InjectModel(AttendanceRawLog)
    private readonly attendanceRawLogModel: typeof AttendanceRawLog,
  ) {}

  list(deviceUserId?: string, deviceId?: string): Promise<AttendanceRawLog[]> {
    const where: Record<string, unknown> = {};
    if (deviceUserId) where.deviceUserId = deviceUserId;
    if (deviceId) where.deviceId = deviceId;
    return this.attendanceRawLogModel.findAll({
      where,
      order: [['scanTime', 'ASC']],
    });
  }

  // Used by reconciliation: every scan for one device_user_id+device_id on one calendar day.
  findForDeviceUserAndDate(
    deviceUserId: string,
    deviceId: string,
    dateStart: Date,
    dateEnd: Date,
  ): Promise<AttendanceRawLog[]> {
    return this.attendanceRawLogModel.findAll({
      where: {
        deviceUserId,
        deviceId,
        scanTime: { [Op.gte]: dateStart, [Op.lt]: dateEnd },
      },
      order: [['scanTime', 'ASC']],
    });
  }

  create(dto: CreateAttendanceRawLogDto): Promise<AttendanceRawLog> {
    return this.attendanceRawLogModel.create(dto as any);
  }

  async bulkCreate(
    dtos: CreateAttendanceRawLogDto[],
  ): Promise<AttendanceRawLog[]> {
    return this.attendanceRawLogModel.bulkCreate(dtos as any[]);
  }

  async remove(id: string): Promise<void> {
    const record = await this.attendanceRawLogModel.findByPk(id);
    if (!record) {
      throw new NotFoundException(`Attendance raw log ${id} not found`);
    }
    await record.destroy();
  }
}
