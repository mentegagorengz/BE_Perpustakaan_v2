import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
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
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { ApiResponseWrapped } from '../../common/decorators/api-docs.decorator';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  buildAuthCookieOptions,
} from '../../config/cookie.config';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Register user baru' })
  @ApiResponseWrapped(
    undefined,
    'Registrasi berhasil, user dibuat (password tidak pernah dikembalikan)',
    HttpStatus.CREATED,
  )
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Registrasi berhasil, user dibuat')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({
    summary:
      'Login dan set access token serta refresh token ke cookie HttpOnly',
    description:
      'Menyetel cookie `access_token` dan `refresh_token` (HttpOnly). Access token dan refreshToken juga dikembalikan di response.',
  })
  @ApiOkResponse({
    description: 'Login berhasil, cookie access_token dan refresh_token diset',
    schema: {
      example: {
        success: true,
        message: 'Success',
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
  @ResponseMessage('Login successful')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.login(loginDto);

    response.cookie(
      ACCESS_TOKEN_COOKIE,
      accessToken,
      buildAuthCookieOptions(15 * 60 * 1000),
    );
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      refreshToken,
      buildAuthCookieOptions(7 * 24 * 60 * 60 * 1000),
    );

    return { user, refreshToken };
  }

  @ApiOperation({
    summary: 'Rotasi refresh token dengan grace period',
    description:
      'Membaca refreshToken dari body atau cookie `refresh_token`. Mengembalikan accessToken + refreshToken baru dan memperbarui cookie HttpOnly.',
  })
  @ApiOkResponse({
    description:
      'Rotasi berhasil, cookie access_token dan refresh_token diperbarui',
    schema: {
      example: {
        success: true,
        message: 'Success',
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
  @ResponseMessage('Refresh token berhasil dirotasi')
  async refresh(
    @Req() request: Request,
    @Body() refreshTokenDto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token: string | undefined =
      (request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined) ||
      (request.cookies?.['refreshToken'] as string | undefined) ||
      refreshTokenDto?.refreshToken;

    if (!token) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const rotated =
      await this.authService.rotateRefreshTokenWithGracePeriod(token);

    response.cookie(
      ACCESS_TOKEN_COOKIE,
      rotated.accessToken,
      buildAuthCookieOptions(15 * 60 * 1000),
    );
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      rotated.refreshToken,
      buildAuthCookieOptions(7 * 24 * 60 * 60 * 1000),
    );

    return {
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken,
    };
  }

  @ApiOperation({
    summary: 'Logout: revoke refresh token sesi dan hapus cookie',
  })
  @ApiOkResponse({
    description: 'Sesi revoke, cookie access_token dan refresh_token dihapus',
    schema: {
      example: {
        success: true,
        message: 'Success',
        data: { message: 'Logged out' },
      },
    },
  })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged out')
  async logout(
    @Req() request: Request,
    @Body() logoutDto: RefreshTokenDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token: string | undefined =
      logoutDto?.refreshToken ||
      (request.cookies?.[REFRESH_TOKEN_COOKIE] as string | undefined) ||
      (request.cookies?.['refreshToken'] as string | undefined);

    if (token) {
      await this.authService.logout(token);
    }
    response.clearCookie(ACCESS_TOKEN_COOKIE, buildAuthCookieOptions());
    response.clearCookie(REFRESH_TOKEN_COOKIE, buildAuthCookieOptions());
  }

  @ApiOperation({ summary: 'Lihat profil user yang sedang login' })
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @ApiCookieAuth()
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('Profil user berhasil diambil')
  @Get('profile')
  getProfile(@GetUser() user: { id: number; email: string; role: string }) {
    return user;
  }
}
