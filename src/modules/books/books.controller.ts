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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BooksService } from './books.service';
import { Book } from './entities/book.entity';
import { BookItem } from './entities/book-item.entity';
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
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @ApiOperation({ summary: 'Tambah buku baru' })
  @ApiResponseWrapped(Book, undefined, 201)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiAuthErrors()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Buku berhasil ditambahkan')
  @Post()
  async create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  @ApiOperation({ summary: 'List semua buku (paginated)' })
  @ApiResponseWrapped(Book, undefined, undefined, true)
  @ResponseMessage('Berhasil mengambil daftar buku')
  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.booksService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Detail buku beserta items' })
  @ApiResponseWrapped(Book)
  @ApiNotFound('Buku')
  @ResponseMessage('Detail buku berhasil diambil')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.booksService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update buku' })
  @ApiResponseWrapped(Book)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiAuthErrors()
  @ApiNotFound('Buku')
  @ResponseMessage('Buku berhasil diubah')
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.booksService.update(+id, updateBookDto);
  }

  @ApiOperation({ summary: 'Hapus buku' })
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  @ApiAuthErrors()
  @ApiNotFound('Buku')
  @ResponseMessage('Buku berhasil dihapus')
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.booksService.remove(+id);
  }

  @ApiOperation({ summary: 'Tambah eksemplar fisik buku' })
  @ApiResponseWrapped(BookItem, undefined, 201)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiAuthErrors()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Eksemplar buku berhasil ditambahkan')
  @Post('items')
  async createItem(@Body() createBookItemDto: CreateBookItemDto) {
    return this.booksService.createItem(createBookItemDto);
  }

  @ApiOperation({ summary: 'List eksemplar sebuah buku' })
  @ApiResponseWrapped()
  @ApiNotFound('Buku')
  @ResponseMessage('Daftar eksemplar buku berhasil diambil')
  @Get(':id/items')
  async findAllItems(@Param('id') id: string) {
    return this.booksService.findAllItems(+id);
  }

  @ApiOperation({ summary: 'Tambah banyak buku sekaligus' })
  @ApiResponseWrapped(Book, undefined, 201)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ApiAuthErrors()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Buku berhasil ditambahkan secara massal')
  @Post('bulk')
  async createMany(
    @Body(new ParseArrayPipe({ items: CreateBookDto }))
    booksDto: CreateBookDto[],
  ) {
    return this.booksService.createMany(booksDto);
  }
}
