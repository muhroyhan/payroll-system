import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Kasbon } from './entities/kasbon.entity';
import { KasbonDeduction } from './entities/kasbon-deduction.entity';
import { KasbonService } from './kasbon.service';
import { KasbonController } from './kasbon.controller';

@Module({
  imports: [SequelizeModule.forFeature([Kasbon, KasbonDeduction])],
  controllers: [KasbonController],
  providers: [KasbonService],
  exports: [KasbonService],
})
export class KasbonModule {}
