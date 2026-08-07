import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GetUser } from '../../common/decorators/get-user.decorator';
import { ApiResponseWrapped } from '../../common/decorators/api-docs.decorator';
import {
  ACCESS_TOKEN_COOKIE,
  buildAuthCookieOptions,
} from '../../config/cookie.config';

@ApiTags('Auth')
@ApiResponseWrapped()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register user baru' })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({
    summary: 'Login dan set access token ke cookie HttpOnly',
    description:
      'Menyetel cookie `auth_token` (HttpOnly). Access token TIDAK ada di body; refreshToken ada di body untuk keperluan rotasi.',
  })
  @ApiOkResponse({
    description: 'Login berhasil, cookie auth_token diset',
    schema: {
      example: {
        statusCode: 200,
        message: 'Login successful',
        data: {
          message: 'Login successful',
          user: { id: 1, email: 'user@example.com', role: 'USER' },
          refreshToken: 'opaque-refresh-token',
        },
      },
    },
  })
  @ApiResponseWrapped()
  // Anti brute-force: maks 5 percobaan / 15 menit per IP.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(loginDto);

    response.cookie(ACCESS_TOKEN_COOKIE, accessToken, buildAuthCookieOptions());

    return { message: 'Login successful', user, refreshToken };
  }

  @ApiOperation({
    summary: 'Rotasi refresh token dengan grace period',
    description:
      'Mengembalikan accessToken + refreshToken baru di body dan memperbarui cookie `auth_token`. Refresh token lama valid 10–30 detik (grace); replay setelah grace → revoke seluruh sesi.',
  })
  @ApiOkResponse({
    description: 'Rotasi berhasil, cookie auth_token diperbarui',
    schema: {
      example: {
        statusCode: 200,
        message: 'OK',
        data: {
          accessToken: 'jwt.access.token',
          refreshToken: 'opaque-refresh-token-baru',
        },
      },
    },
  })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const rotated = await this.authService.rotateRefreshTokenWithGracePeriod(
      refreshTokenDto.refreshToken,
    );

    response.cookie(
      ACCESS_TOKEN_COOKIE,
      rotated.accessToken,
      buildAuthCookieOptions(),
    );

    return {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
    };
  }

  @ApiOperation({ summary: 'Logout: revoke refresh token sesi' })
  @ApiOkResponse({
    description: 'Sesi revoke, cookie auth_token dihapus',
    schema: {
      example: {
        statusCode: 200,
        message: 'OK',
        data: { message: 'Logged out' },
      },
    },
  })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() logoutDto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.authService.logout(logoutDto.refreshToken);
    response.clearCookie(ACCESS_TOKEN_COOKIE, buildAuthCookieOptions());
    return { message: 'Logged out' };
  }

  @ApiOperation({ summary: 'Lihat profil user yang sedang login' })
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@GetUser() user: { id: number; email: string; role: string }) {
    return user;
  }
}
