import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@payroll-system/shared-types';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { HolidaysService } from './holidays.service';
import { HolidaySyncService } from './holiday-sync.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Controller('holidays')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class HolidaysController {
  constructor(
    private readonly holidaysService: HolidaysService,
    private readonly holidaySyncService: HolidaySyncService,
  ) {}

  @Get()
  list(@Query('from') from?: string, @Query('to') to?: string) {
    return this.holidaysService.list(from, to);
  }

  // Pull/refresh from the Google Calendar Indonesian feed; never clobbers
  // manual entries. Admin-only. Optional ?year= restricts the import.
  @Post('sync')
  @Roles(Role.ADMIN)
  sync(@Query('year', new ParseIntPipe({ optional: true })) year?: number) {
    return this.holidaySyncService.syncFromGoogleCalendar(year);
  }

  @Post()
  create(@Body() dto: CreateHolidayDto) {
    return this.holidaysService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.holidaysService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.holidaysService.remove(id);
  }
}
