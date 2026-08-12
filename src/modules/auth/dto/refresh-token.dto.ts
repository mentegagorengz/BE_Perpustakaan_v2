import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({
    example: 'opaque-refresh-token-string',
    description:
      'Refresh token yang dikembalikan saat login atau dikirim lewat cookie',
    required: false,
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
