import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsInt,
  IsArray,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBookDto {
  @ApiProperty({ example: 'Clean Code' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'A Handbook of Agile Software Craftsmanship',
  })
  @IsOptional()
  @IsString()
  sub_title?: string;

  @ApiPropertyOptional({ example: '9780132350884' })
  @IsOptional()
  @IsString()
  isbn_13?: string;

  @ApiPropertyOptional({ example: '0132350882' })
  @IsOptional()
  @IsString()
  isbn_10?: string;

  @ApiPropertyOptional({ example: 2008 })
  @IsOptional()
  @IsInt()
  published_year?: number;

  @ApiPropertyOptional({ example: 'A book about writing clean code' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 1, description: 'ID kategori buku' })
  @IsNotEmpty()
  @IsNumber()
  category_id: number;

  @ApiProperty({ example: 1, description: 'ID penerbit' })
  @IsNotEmpty()
  @IsNumber()
  publisher_id: number;

  @ApiProperty({ example: 1, description: 'ID bahasa' })
  @IsNotEmpty()
  @IsNumber()
  language_id: number;

  @ApiProperty({ example: [1, 2], description: 'Array ID penulis' })
  @IsArray()
  @IsNumber({}, { each: true })
  author_ids: number[];
}
