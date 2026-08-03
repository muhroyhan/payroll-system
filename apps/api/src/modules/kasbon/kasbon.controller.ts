import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { KasbonService } from './kasbon.service';
import { CreateKasbonDto } from './dto/create-kasbon.dto';
import { UpdateKasbonDto } from './dto/update-kasbon.dto';
import { RejectKasbonDto } from './dto/reject-kasbon.dto';
import { KasbonListQueryDto } from './dto/kasbon-list-query.dto';

@Controller('kasbon')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class KasbonController {
  constructor(private readonly kasbonService: KasbonService) {}

  @Get()
  list(@Query() query: KasbonListQueryDto) {
    return this.kasbonService.list(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kasbonService.findByIdOrThrow(id);
  }

  @Post()
  create(@Body() dto: CreateKasbonDto, @CurrentUser() user: AuthenticatedUser) {
    return this.kasbonService.create(dto, user.id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateKasbonDto) {
    return this.kasbonService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kasbonService.remove(id);
  }

  @Put(':id/approve')
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.kasbonService.approve(id, user.id);
  }

  @Put(':id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectKasbonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.kasbonService.reject(id, user.id, dto.reason);
  }
}
