import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SystemRole, UserCategory } from '../../../common/enums/role.enum';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: SystemRole, example: SystemRole.STAFF })
  @IsOptional()
  @IsEnum(SystemRole)
  role?: SystemRole;

  @ApiPropertyOptional({ enum: UserCategory, example: UserCategory.LECTURER })
  @IsOptional()
  @IsEnum(UserCategory)
  category?: UserCategory;
}
