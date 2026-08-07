import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookStatus, BookCondition } from '../../../common/enums/book.enum';

export class CreateBookItemDto {
  @ApiProperty({ example: 'BRC-001', description: 'Barcode unik eksemplar' })
  @IsNotEmpty()
  @IsString()
  barcode: string;

  @ApiProperty({ example: 1, description: 'ID buku induk' })
  @IsNotEmpty()
  @IsNumber()
  book_id: number;

  @ApiPropertyOptional({ enum: BookStatus, example: BookStatus.AVAILABLE })
  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @ApiPropertyOptional({ enum: BookCondition, example: BookCondition.GOOD })
  @IsOptional()
  @IsEnum(BookCondition)
  condition?: BookCondition;
}
