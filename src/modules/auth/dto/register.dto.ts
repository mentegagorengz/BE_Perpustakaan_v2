import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MinLength,
} from 'class-validator';
import { UserCategory } from '../../../common/enums/role.enum';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  identification_number: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password: string;

  @IsNotEmpty()
  @IsString()
  full_name: string;

  @IsEnum(UserCategory)
  category: UserCategory;

  // role TIDAK dimasukkan di sini — user baru otomatis mendapat SystemRole.USER dari entity default
}
