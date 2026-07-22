import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PolicyService } from './policy.service';
import { UpdatePolicyDto } from './dto/update-policy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import {
  ApiAuthErrors,
  ApiResponseWrapped,
} from '../../common/decorators/api-docs.decorator';

@ApiTags('Policy')
@ApiResponseWrapped()
@ApiBearerAuth()
@ApiAuthErrors()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('policy')
export class PolicyController {
  constructor(private readonly policyService: PolicyService) {}

  @ApiOperation({ summary: 'Ambil kebijakan aktif (singleton)' })
  @ApiResponseWrapped()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @Get()
  getPolicy() {
    return this.policyService.getPolicy();
  }

  @ApiOperation({ summary: 'Update kebijakan denda/pinjam' })
  @ApiResponseWrapped()
  @Roles(SystemRole.SUPER_ADMIN)
  @Patch()
  update(@Body() dto: UpdatePolicyDto) {
    return this.policyService.update(dto);
  }
}
