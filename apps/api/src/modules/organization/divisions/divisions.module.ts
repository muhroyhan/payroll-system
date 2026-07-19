import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Division } from './entities/division.entity';
import { DivisionsService } from './divisions.service';
import { DivisionsController } from './divisions.controller';

@Module({
  imports: [SequelizeModule.forFeature([Division])],
  controllers: [DivisionsController],
  providers: [DivisionsService],
  exports: [DivisionsService],
})
export class DivisionsModule {}
