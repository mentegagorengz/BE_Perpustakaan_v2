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
import { LanguagesService } from './languages.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
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

@ApiTags('Languages')
@Controller('languages')
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @ApiOperation({ summary: 'Tambah bahasa baru' })
  @ApiResponseWrapped(undefined, undefined, 201)
  @ApiBearerAuth()
  @ApiAuthErrors()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Bahasa berhasil ditambahkan')
  @Post()
  create(@Body() createLanguageDto: CreateLanguageDto) {
    return this.languagesService.create(createLanguageDto);
  }

  @ApiOperation({ summary: 'List semua bahasa (paginated)' })
  @ApiResponseWrapped()
  @ResponseMessage('Berhasil mengambil daftar bahasa')
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.languagesService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Detail bahasa' })
  @ApiResponseWrapped()
  @ApiNotFound('Bahasa')
  @ResponseMessage('Detail bahasa berhasil diambil')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.languagesService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update bahasa' })
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @ApiAuthErrors()
  @ApiNotFound('Bahasa')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ResponseMessage('Bahasa berhasil diubah')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateLanguageDto: UpdateLanguageDto,
  ) {
    return this.languagesService.update(+id, updateLanguageDto);
  }

  @ApiOperation({ summary: 'Hapus bahasa' })
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @ApiAuthErrors()
  @ApiNotFound('Bahasa')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  @ResponseMessage('Bahasa berhasil dihapus')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.languagesService.remove(+id);
  }
}
