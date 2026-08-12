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
import { CategoriesService } from './categories.service';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
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

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @ApiOperation({ summary: 'Tambah kategori baru' })
  @ApiResponseWrapped(Category, undefined, 201)
  @ApiBearerAuth()
  @ApiAuthErrors()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Kategori berhasil ditambahkan')
  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @ApiOperation({ summary: 'List semua kategori (paginated)' })
  @ApiResponseWrapped(Category, undefined, undefined, true)
  @ResponseMessage('Berhasil mengambil daftar kategori')
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.categoriesService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Detail kategori' })
  @ApiResponseWrapped(Category)
  @ApiNotFound('Kategori')
  @ResponseMessage('Detail kategori berhasil diambil')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update kategori' })
  @ApiResponseWrapped(Category)
  @ApiBearerAuth()
  @ApiAuthErrors()
  @ApiNotFound('Kategori')
  @ResponseMessage('Kategori berhasil diubah')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(+id, updateCategoryDto);
  }

  @ApiOperation({ summary: 'Hapus kategori' })
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @ApiAuthErrors()
  @ApiNotFound('Kategori')
  @ResponseMessage('Kategori berhasil dihapus')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(+id);
  }
}
