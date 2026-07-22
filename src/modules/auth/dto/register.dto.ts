import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserCategory } from '../../../common/enums/role.enum';

export class RegisterDto {
  @ApiProperty({ example: '1234567890', description: 'Nomor identitas unik' })
  @IsNotEmpty()
  @IsString()
  identification_number: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Str0ng!P4ss#2024', minLength: 8 })
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[a-zA-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least 1 letter and 1 number',
  })
  password: string;

  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @ApiProperty({ enum: UserCategory, example: UserCategory.STUDENT })
  @IsEnum(UserCategory)
  category: UserCategory;
}
