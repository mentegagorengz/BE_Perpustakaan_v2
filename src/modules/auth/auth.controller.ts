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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
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

  @ApiOperation({ summary: 'Rotasi refresh token dengan grace period' })
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
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@GetUser() user: { id: number; email: string; role: string }) {
    return user;
  }
}
