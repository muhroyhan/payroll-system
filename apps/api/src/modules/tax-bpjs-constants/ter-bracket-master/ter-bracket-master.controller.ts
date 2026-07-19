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
import { TerBracketMasterService } from './ter-bracket-master.service';
import { CreateTerBracketMasterDto } from './dto/create-ter-bracket-master.dto';
import { UpdateTerBracketMasterDto } from './dto/update-ter-bracket-master.dto';

@Controller('tax-bpjs-constants/ter-bracket-master')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TerBracketMasterController {
  constructor(
    private readonly terBracketMasterService: TerBracketMasterService,
  ) {}

  @Get()
  list() {
    return this.terBracketMasterService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.terBracketMasterService.findByIdOrThrow(id);
  }

  @Post()
  create(
    @Body() dto: CreateTerBracketMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.terBracketMasterService.create(dto, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTerBracketMasterDto) {
    return this.terBracketMasterService.update(id, dto);
  }
}
