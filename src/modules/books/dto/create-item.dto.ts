import {
  IsNotEmpty,
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
} from 'class-validator';
import { BookStatus, BookCondition } from '../../../common/enums/book.enum';

export class CreateBookItemDto {
  @IsNotEmpty()
  @IsString()
  barcode: string;

  @IsNotEmpty()
  @IsNumber()
  book_id: number;

  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @IsOptional()
  @IsEnum(BookCondition)
  condition?: BookCondition;
}
