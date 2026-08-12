import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import {
  ApiAuthErrors,
  ApiNotFound,
  ApiResponseWrapped,
} from '../../common/decorators/api-docs.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

type AuthenticatedRequest = Request & { user: { id: number } };

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: 'Melihat semua berita (Publik)' })
  @ApiResponseWrapped()
  @ResponseMessage('Berhasil mengambil daftar berita')
  findAll() {
    return this.articlesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail berita' })
  @ApiResponseWrapped(Article)
  @ApiNotFound('Berita')
  @ResponseMessage('Detail berita berhasil diambil')
  findOne(@Param('id') id: string) {
    return this.articlesService.findOne(+id);
  }

  @Post()
  @ApiResponseWrapped(Article, undefined, 201)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat berita baru (Admin/Staff Only)' })
  @ResponseMessage('Berita berhasil ditambahkan')
  create(
    @Body() createArticleDto: CreateArticleDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.articlesService.create(createArticleDto, req.user);
  }

  @Patch(':id')
  @ApiResponseWrapped(Article)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiOperation({ summary: 'Update berita' })
  @ApiAuthErrors()
  @ApiNotFound('Berita')
  @ResponseMessage('Berita berhasil diubah')
  update(@Param('id') id: string, @Body() updateData: UpdateArticleDto) {
    return this.articlesService.update(+id, updateData);
  }

  @Delete(':id')
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Menghapus berita' })
  @ApiAuthErrors()
  @ApiNotFound('Berita')
  @ResponseMessage('Berita berhasil dihapus')
  remove(@Param('id') id: string) {
    return this.articlesService.remove(+id);
  }

  @Post('bulk')
  @ApiResponseWrapped(Article, undefined, 201)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Membuat banyak berita sekaligus (Admin/Staff Only)',
  })
  @ResponseMessage('Berita berhasil ditambahkan secara massal')
  createMany(
    @Body() createArticlesDto: CreateArticleDto[],
    @Req() req: AuthenticatedRequest,
  ) {
    return this.articlesService.createMany(createArticlesDto, req.user);
  }
}
