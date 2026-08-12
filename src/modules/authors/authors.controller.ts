import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthorsService } from './authors.service';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  ApiAuthErrors,
  ApiNotFound,
  ApiResponseWrapped,
} from '../../common/decorators/api-docs.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Authors')
@Controller('authors')
export class AuthorsController {
  constructor(private readonly authorsService: AuthorsService) {}

  @ApiOperation({ summary: 'Tambah penulis baru' })
  @ApiResponseWrapped(undefined, undefined, 201)
  @ApiBearerAuth()
  @ApiAuthErrors()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Penulis berhasil ditambahkan')
  @Post()
  create(@Body() createAuthorDto: CreateAuthorDto) {
    return this.authorsService.create(createAuthorDto);
  }

  @ApiOperation({ summary: 'List semua penulis (paginated)' })
  @ApiResponseWrapped()
  @ResponseMessage('Berhasil mengambil daftar penulis')
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.authorsService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Detail penulis' })
  @ApiResponseWrapped()
  @ApiNotFound('Penulis')
  @ResponseMessage('Detail penulis berhasil diambil')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authorsService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update penulis' })
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @ApiAuthErrors()
  @ApiNotFound('Penulis')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ResponseMessage('Penulis berhasil diubah')
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthorDto: UpdateAuthorDto) {
    return this.authorsService.update(+id, updateAuthorDto);
  }

  @ApiOperation({ summary: 'Hapus penulis' })
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @ApiAuthErrors()
  @ApiNotFound('Penulis')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  @ResponseMessage('Penulis berhasil dihapus')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authorsService.remove(+id);
  }
}
