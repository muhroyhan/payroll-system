import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BpjsKesehatanMaster } from './entities/bpjs-kesehatan-master.entity';
import { BpjsKesehatanMasterService } from './bpjs-kesehatan-master.service';
import { BpjsKesehatanMasterController } from './bpjs-kesehatan-master.controller';

@Module({
  imports: [SequelizeModule.forFeature([BpjsKesehatanMaster])],
  controllers: [BpjsKesehatanMasterController],
  providers: [BpjsKesehatanMasterService],
  exports: [BpjsKesehatanMasterService],
})
export class BpjsKesehatanMasterModule {}
