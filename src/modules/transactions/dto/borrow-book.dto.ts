import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class BorrowBookDto {
  @IsNotEmpty()
  @IsString()
  barcode: string;

  @IsNotEmpty()
  @IsNumber()
  user_id: number;
}
