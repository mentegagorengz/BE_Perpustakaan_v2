import { IsNotEmpty, IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateLanguageDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;
}
