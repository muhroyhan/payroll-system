import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Fingerprint } from './entities/fingerprint.entity';
import { FingerprintsService } from './fingerprints.service';
import { FingerprintsController } from './fingerprints.controller';

@Module({
  imports: [SequelizeModule.forFeature([Fingerprint])],
  controllers: [FingerprintsController],
  providers: [FingerprintsService],
  exports: [FingerprintsService],
})
export class FingerprintsModule {}
