import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty({ example: 'Koleksi Buku Baru Maret 2026' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Berikut adalah daftar buku teknologi terbaru...' })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ example: 'https://image.com/cover.jpg' })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  is_published?: boolean;
}
