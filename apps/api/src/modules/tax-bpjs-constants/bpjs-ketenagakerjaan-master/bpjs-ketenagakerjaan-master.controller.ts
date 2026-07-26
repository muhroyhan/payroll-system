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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import {
  AsOfQueryDto,
  asOfOrToday,
} from '../../../common/effective-dating/as-of-query.dto';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { BpjsKetenagakerjaanMasterService } from './bpjs-ketenagakerjaan-master.service';
import { CreateBpjsKetenagakerjaanMasterDto } from './dto/create-bpjs-ketenagakerjaan-master.dto';
import { UpdateBpjsKetenagakerjaanMasterDto } from './dto/update-bpjs-ketenagakerjaan-master.dto';

@Controller('tax-bpjs-constants/bpjs-ketenagakerjaan-master')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class BpjsKetenagakerjaanMasterController {
  constructor(
    private readonly bpjsKetenagakerjaanMasterService: BpjsKetenagakerjaanMasterService,
  ) {}

  @Get()
  list() {
    return this.bpjsKetenagakerjaanMasterService.list();
  }

  // The single rate card active for ?asOf=YYYY-MM-DD (default today).
  @Get('effective')
  resolveEffective(@Query() query: AsOfQueryDto) {
    return this.bpjsKetenagakerjaanMasterService.resolveEffective(
      asOfOrToday(query.asOf),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bpjsKetenagakerjaanMasterService.findByIdOrThrow(id);
  }

  @Post()
  create(
    @Body() dto: CreateBpjsKetenagakerjaanMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bpjsKetenagakerjaanMasterService.create(dto, user.id, user.role);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBpjsKetenagakerjaanMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bpjsKetenagakerjaanMasterService.update(
      id,
      dto,
      user.id,
      user.role,
    );
  }
}
