import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { PtkpMasterService } from './ptkp-master.service';
import { CreatePtkpMasterDto } from './dto/create-ptkp-master.dto';
import { UpdatePtkpMasterDto } from './dto/update-ptkp-master.dto';

@Controller('tax-bpjs-constants/ptkp-master')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class PtkpMasterController {
  constructor(private readonly ptkpMasterService: PtkpMasterService) {}

  @Get()
  list() {
    return this.ptkpMasterService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ptkpMasterService.findByIdOrThrow(id);
  }

  @Post()
  create(
    @Body() dto: CreatePtkpMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ptkpMasterService.create(dto, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePtkpMasterDto) {
    return this.ptkpMasterService.update(id, dto);
  }
}
