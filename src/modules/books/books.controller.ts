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
} from '@nestjs/common';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateBookItemDto } from './dto/create-item.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  // Endpoint 1: Mendaftarkan Judul Buku (Metadata) - hanya ADMIN & STAFF
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @Post()
  async create(@Body() createBookDto: CreateBookDto) {
    return this.booksService.create(createBookDto);
  }

  // Endpoint 2: Melihat Semua Koleksi Buku (Public)
  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.booksService.findAll(paginationDto);
  }

  // Endpoint 3: Melihat Detail Buku
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.booksService.findOne(+id);
  }

  // Endpoint 4: Update Buku - hanya ADMIN & STAFF
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    return this.booksService.update(+id, updateBookDto);
  }

  // Endpoint 5: Hapus Buku - hanya SUPER_ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.booksService.remove(+id);
  }

  // Endpoint 6: Mendaftarkan Fisik Buku (Unit/Eksemplar) - hanya ADMIN & STAFF
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @Post('items')
  async createItem(@Body() createBookItemDto: CreateBookItemDto) {
    return this.booksService.createItem(createBookItemDto);
  }

  // Endpoint 7: Lihat semua item/eksemplar dari sebuah buku
  @Get(':id/items')
  async findAllItems(@Param('id') id: string) {
    return this.booksService.findAllItems(+id);
  }
}
