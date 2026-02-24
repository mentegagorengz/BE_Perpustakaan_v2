import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateAuthorDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  bio?: string; // Sesuai kolom 'bio' di skrip SQL kamu
}
