import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Patch,
  Body,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto);
  }

  @Get(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }

  @Patch(':id/role')
  @Roles(SystemRole.SUPER_ADMIN)
  updateRole(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateRole(+id, updateUserDto);
  }

  @Delete(':id')
  @Roles(SystemRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
