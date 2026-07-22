import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BorrowBookDto {
  @ApiProperty({ example: 'B001', description: 'Barcode fisik buku' })
  @IsNotEmpty()
  @IsString()
  barcode: string;
}
