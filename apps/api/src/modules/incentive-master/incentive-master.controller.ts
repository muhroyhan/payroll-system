import {
  Body,
  Controller,
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
import { asOfOrToday } from '../../common/effective-dating/as-of-query.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';
import { IncentiveMasterService } from './incentive-master.service';
import { CreateIncentiveMasterDto } from './dto/create-incentive-master.dto';
import { UpdateIncentiveMasterDto } from './dto/update-incentive-master.dto';
import { ResolveScopeQueryDto } from '../scope-resolver/dto/resolve-scope-query.dto';

@Controller('incentive-master')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class IncentiveMasterController {
  constructor(
    private readonly incentiveMasterService: IncentiveMasterService,
  ) {}

  @Get()
  list() {
    return this.incentiveMasterService.list();
  }

  @Get('resolve')
  resolve(@Query() query: ResolveScopeQueryDto) {
    return this.incentiveMasterService.resolveForEmployee(
      query.employeeId,
      asOfOrToday(query.asOf),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.incentiveMasterService.findByIdOrThrow(id);
  }

  @Post()
  create(
    @Body() dto: CreateIncentiveMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentiveMasterService.create(dto, user.id, user.role);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateIncentiveMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.incentiveMasterService.update(id, dto, user.id, user.role);
  }
}
