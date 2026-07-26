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
import { BpjsKesehatanMasterService } from './bpjs-kesehatan-master.service';
import { CreateBpjsKesehatanMasterDto } from './dto/create-bpjs-kesehatan-master.dto';
import { UpdateBpjsKesehatanMasterDto } from './dto/update-bpjs-kesehatan-master.dto';

@Controller('tax-bpjs-constants/bpjs-kesehatan-master')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class BpjsKesehatanMasterController {
  constructor(
    private readonly bpjsKesehatanMasterService: BpjsKesehatanMasterService,
  ) {}

  @Get()
  list() {
    return this.bpjsKesehatanMasterService.list();
  }

  // The single rate/cap row active for ?asOf=YYYY-MM-DD (default today).
  @Get('effective')
  resolveEffective(@Query() query: AsOfQueryDto) {
    return this.bpjsKesehatanMasterService.resolveEffective(
      asOfOrToday(query.asOf),
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bpjsKesehatanMasterService.findByIdOrThrow(id);
  }

  @Post()
  create(
    @Body() dto: CreateBpjsKesehatanMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bpjsKesehatanMasterService.create(dto, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateBpjsKesehatanMasterDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.bpjsKesehatanMasterService.update(id, dto, user.id);
  }
}
