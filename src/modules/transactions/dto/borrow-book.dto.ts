import { IsNotEmpty, IsString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BorrowBookDto {
  @ApiProperty({ example: 'B001', description: 'Barcode fisik buku' })
  @IsNotEmpty()
  @IsString()
  barcode: string;

  @ApiProperty({ example: 1, description: 'ID User yang meminjam' })
  @IsNotEmpty()
  @IsNumber()
  user_id: number;
}
