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
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { DivisionsService } from './divisions.service';
import { CreateDivisionDto } from './dto/create-division.dto';

@Controller('divisions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.HR_STAFF)
export class DivisionsController {
  constructor(private readonly divisionsService: DivisionsService) {}

  @Get()
  list() {
    return this.divisionsService.list();
  }

  @Post()
  create(@Body() dto: CreateDivisionDto) {
    return this.divisionsService.create(dto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateDivisionDto) {
    return this.divisionsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.divisionsService.remove(id);
  }
}
