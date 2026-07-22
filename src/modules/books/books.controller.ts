import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  ParseArrayPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateBookItemDto } from './dto/create-item.dto';
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

@ApiTags('Books')
@ApiResponseWrapped()
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @ApiOperation({ summary: 'Tambah buku baru' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiAuthErrors()
  @Post()
  async create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @ApiOperation({ summary: 'List semua buku (paginated)' })
  @ApiResponseWrapped()
  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.booksService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Detail buku beserta items' })
  @ApiNotFound('Buku')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.booksService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update buku' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiAuthErrors()
  @ApiNotFound('Buku')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.booksService.update(+id, updateBookDto);
  }

  @ApiOperation({ summary: 'Hapus buku' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiAuthErrors()
  @ApiNotFound('Buku')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.booksService.remove(+id);
  }

  @ApiOperation({ summary: 'Tambah eksemplar fisik buku' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiAuthErrors()
  @Post('items')
  async createItem(@Body() createBookItemDto: CreateBookItemDto) {
    return this.booksService.createItem(createBookItemDto);
  }

  @ApiOperation({ summary: 'List eksemplar sebuah buku' })
  @ApiNotFound('Buku')
  @Get(':id/items')
  async findAllItems(@Param('id') id: string) {
    return this.booksService.findAllItems(+id);
  }

  @ApiOperation({ summary: 'Tambah banyak buku sekaligus' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiAuthErrors()
  @Post('bulk')
  async createMany(
    @Body(new ParseArrayPipe({ items: CreateBookDto }))
    booksDto: CreateBookDto[],
  ) {
    return this.booksService.createMany(booksDto);
  }
}
