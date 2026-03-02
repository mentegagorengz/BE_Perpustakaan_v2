import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePublisherDto {
  @ApiProperty({ example: 'Prentice Hall', maxLength: 255 })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'New Jersey, USA' })
  @IsOptional()
  @IsString()
  address?: string;
}
