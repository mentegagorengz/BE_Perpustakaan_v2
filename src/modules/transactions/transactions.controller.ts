import {
  Controller,
  Post,
  Body,
  UseGuards,
  Patch,
  Param,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { Transaction } from './entities/transaction.entity';
import { BorrowBookDto } from './dto/borrow-book.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  ApiAuthErrors,
  ApiResponseWrapped,
} from '../../common/decorators/api-docs.decorator';

@ApiTags('Transactions')
@ApiBearerAuth()
@ApiAuthErrors()
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiOperation({ summary: 'Pinjam buku' })
  @ApiResponseWrapped(Transaction, undefined, 201)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Buku berhasil dipinjam')
  @Post('borrow')
  async borrow(@Body() dto: BorrowBookDto, @GetUser('id') userId: number) {
    return this.transactionsService.borrowBook(dto.barcode, userId);
  }

  @ApiOperation({ summary: 'Kembalikan buku berdasarkan barcode' })
  @ApiResponseWrapped(Transaction)
  @ResponseMessage('Buku berhasil dikembalikan')
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @Patch('return/:barcode')
  async returnBook(@Param('barcode') barcode: string) {
    return this.transactionsService.returnBook(barcode);
  }

  @ApiOperation({ summary: 'Riwayat semua transaksi (paginated)' })
  @ApiResponseWrapped(Transaction, undefined, undefined, true)
  @UseGuards(RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ResponseMessage('Berhasil mengambil riwayat transaksi')
  @Get()
  async findAll(@Query() paginationDto: PaginationDto) {
    return this.transactionsService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Riwayat transaksi user yang login' })
  @ApiResponseWrapped(Transaction, undefined, undefined, true)
  @ResponseMessage('Berhasil mengambil riwayat transaksi Anda')
  @Get('my-history')
  async myHistory(
    @GetUser('id') userId: number,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.transactionsService.findByUser(userId, paginationDto);
  }
}
