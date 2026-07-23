import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { FingerprintsService } from './fingerprints.service';
import { CreateFingerprintDto } from './dto/create-fingerprint.dto';
import { UpdateFingerprintDto } from './dto/update-fingerprint.dto';

@Controller('fingerprints')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class FingerprintsController {
  constructor(private readonly fingerprintsService: FingerprintsService) {}

  @Get()
  list() {
    return this.fingerprintsService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.fingerprintsService.findByIdOrThrow(id);
  }

  @Post()
  create(@Body() dto: CreateFingerprintDto) {
    return this.fingerprintsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFingerprintDto) {
    return this.fingerprintsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.fingerprintsService.remove(id);
  }
}
