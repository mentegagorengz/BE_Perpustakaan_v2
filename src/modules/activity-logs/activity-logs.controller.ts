import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog } from './entities/activity-log.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import {
  ApiAuthErrors,
  ApiResponseWrapped,
} from '../../common/decorators/api-docs.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Activity Logs')
@ApiResponseWrapped()
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @Get()
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Melihat seluruh log aktivitas (Super Admin Only)' })
  @ApiResponseWrapped(ActivityLog, undefined, undefined, true)
  @ResponseMessage('Berhasil mengambil log aktivitas')
  findAll(@Query() paginationDto: PaginationDto) {
    return this.activityLogsService.findAll(paginationDto);
  }
}
