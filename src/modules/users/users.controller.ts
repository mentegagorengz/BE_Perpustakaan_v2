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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import {
  ApiAuthErrors,
  ApiNotFound,
  ApiResponseWrapped,
} from '../../common/decorators/api-docs.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@ApiAuthErrors()
@ApiResponseWrapped(User)
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: 'List semua user (paginated)' })
  @Get()
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiResponseWrapped(undefined, undefined, undefined, true)
  @ResponseMessage('Berhasil mengambil daftar user')
  findAll(@Query() paginationDto: PaginationDto) {
    return this.usersService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Detail user berdasarkan ID' })
  @Get(':id')
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiNotFound('User')
  @ResponseMessage('Detail user berhasil diambil')
  findOne(@Param('id') id: string) {
    return this.usersService.findById(+id);
  }

  @ApiOperation({ summary: 'Update role/kategori user' })
  @Patch(':id/role')
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiNotFound('User')
  @ResponseMessage('Role/kategori user berhasil diubah')
  updateRole(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateRole(+id, updateUserDto);
  }

  @ApiOperation({ summary: 'Hapus user' })
  @Delete(':id')
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiNotFound('User')
  @ResponseMessage('User berhasil dihapus')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}
