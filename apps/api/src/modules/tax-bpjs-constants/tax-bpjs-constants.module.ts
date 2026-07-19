import { Module } from '@nestjs/common';
import { PtkpMasterModule } from './ptkp-master/ptkp-master.module';
import { TerBracketMasterModule } from './ter-bracket-master/ter-bracket-master.module';
import { BpjsKesehatanMasterModule } from './bpjs-kesehatan-master/bpjs-kesehatan-master.module';
import { BpjsKetenagakerjaanMasterModule } from './bpjs-ketenagakerjaan-master/bpjs-ketenagakerjaan-master.module';

@Module({
  imports: [
    PtkpMasterModule,
    TerBracketMasterModule,
    BpjsKesehatanMasterModule,
    BpjsKetenagakerjaanMasterModule,
  ],
  exports: [
    PtkpMasterModule,
    TerBracketMasterModule,
    BpjsKesehatanMasterModule,
    BpjsKetenagakerjaanMasterModule,
  ],
})
export class TaxBpjsConstantsModule {}
