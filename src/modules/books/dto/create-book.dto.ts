import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsNumber,
} from 'class-validator';

export class CreateBookDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  sub_title?: string;

  @IsOptional()
  @IsString()
  isbn_13?: string;

  @IsOptional()
  @IsString()
  isbn_10?: string;

  @IsOptional()
  @IsInt()
  published_year?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsNumber()
  category_id: number;

  @IsNotEmpty()
  @IsNumber()
  publisher_id: number;

  @IsNotEmpty()
  @IsNumber()
  language_id: number;

  @IsArray()
  @IsNumber({}, { each: true })
  author_ids: number[];
}
