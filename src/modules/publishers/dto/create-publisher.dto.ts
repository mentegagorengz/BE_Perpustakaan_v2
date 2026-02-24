// src/modules/publishers/dto/create-publisher.dto.ts
import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreatePublisherDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}
