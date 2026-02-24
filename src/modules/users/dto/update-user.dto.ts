import { IsEnum, IsOptional } from 'class-validator';
import { SystemRole, UserCategory } from '../../../common/enums/role.enum';

export class UpdateUserDto {
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;

  @IsOptional()
  @IsEnum(UserCategory)
  category?: UserCategory;
}
