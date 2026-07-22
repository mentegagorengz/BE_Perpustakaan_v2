import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import {
  ApiAuthErrors,
  ApiResponseWrapped,
} from '../../common/decorators/api-docs.decorator';

@ApiTags('Dashboard')
@ApiResponseWrapped()
@ApiBearerAuth()
@ApiAuthErrors()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({
    summary: 'Ringkasan statistik sistem (SUPER_ADMIN & STAFF)',
  })
  @Get('summary')
  @ApiResponseWrapped()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  async getSummary() {
    return await this.dashboardService.getSummary();
  }
}
