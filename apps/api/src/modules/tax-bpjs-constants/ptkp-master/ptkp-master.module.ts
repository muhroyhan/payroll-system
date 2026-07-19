import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PtkpMaster } from './entities/ptkp-master.entity';
import { PtkpMasterService } from './ptkp-master.service';
import { PtkpMasterController } from './ptkp-master.controller';

@Module({
  imports: [SequelizeModule.forFeature([PtkpMaster])],
  controllers: [PtkpMasterController],
  providers: [PtkpMasterService],
  exports: [PtkpMasterService],
})
export class PtkpMasterModule {}
