import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Get,
  Query,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  // Pinjam buku - semua user yang login bisa pinjam
  @Post('borrow')
  async borrow(@Body() dto: BorrowBookDto, @GetUser('id') userId: number) {
    return this.transactionsService.borrowBook({ ...dto, user_id: userId });
  }

  // Kembalikan buku - hanya ADMIN & STAFF yang bisa proses pengembalian
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @Patch('return/:barcode')
  async returnBook(@Param('barcode') barcode: string) {
    return this.transactionsService.returnBook(barcode);
  }

  // Riwayat semua transaksi - hanya ADMIN & STAFF
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.transactionsService.findAll(paginationDto);
  }

  // Riwayat transaksi user yang login
  @Get('my-history')
  async myHistory(
    @GetUser('id') userId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.transactionsService.findByUser(userId, paginationDto);
  }
}
