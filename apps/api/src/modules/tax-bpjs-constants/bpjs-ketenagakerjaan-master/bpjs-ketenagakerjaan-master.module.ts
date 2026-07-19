import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BpjsKetenagakerjaanMaster } from './entities/bpjs-ketenagakerjaan-master.entity';
import { BpjsKetenagakerjaanMasterService } from './bpjs-ketenagakerjaan-master.service';
import { BpjsKetenagakerjaanMasterController } from './bpjs-ketenagakerjaan-master.controller';

@Module({
  imports: [SequelizeModule.forFeature([BpjsKetenagakerjaanMaster])],
  controllers: [BpjsKetenagakerjaanMasterController],
  providers: [BpjsKetenagakerjaanMasterService],
  exports: [BpjsKetenagakerjaanMasterService],
})
export class BpjsKetenagakerjaanMasterModule {}
