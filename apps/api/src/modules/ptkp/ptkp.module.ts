import { Module } from '@nestjs/common';
import { PtkpDerivationService } from './ptkp-derivation.service';

@Module({
  providers: [PtkpDerivationService],
  exports: [PtkpDerivationService],
})
export class PtkpModule {}
