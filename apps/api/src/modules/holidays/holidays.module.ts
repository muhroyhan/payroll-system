import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Holiday } from './entities/holiday.entity';
import { HolidaysService } from './holidays.service';
import { HolidaySyncService } from './holiday-sync.service';
import { HolidaysController } from './holidays.controller';

@Module({
  imports: [SequelizeModule.forFeature([Holiday])],
  controllers: [HolidaysController],
  providers: [HolidaysService, HolidaySyncService],
  exports: [HolidaysService],
})
export class HolidaysModule {}
