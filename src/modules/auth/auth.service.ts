import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshSession } from './entities/refresh-session.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Parse durasi seperti '15m', '1d', '2h' → milidetik. Default 15 menit. */
function parseDuration(value: string | undefined, fallbackMs: number): number {
  if (!value) return fallbackMs;
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return fallbackMs;
  const amount = Number(match[1]);
  const unitMs: Record<'s' | 'm' | 'h' | 'd', number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const factor = unitMs[match[2] as 's' | 'm' | 'h' | 'd'];
  return amount * factor;
}

@Injectable()
export class AuthService {
  private readonly refreshTtlMs: number;
  private readonly graceSeconds: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly dataSource: DataSource,
    @InjectRepository(RefreshSession)
    private readonly refreshSessionRepository: Repository<RefreshSession>,
  ) {
    this.refreshTtlMs = parseDuration(
      process.env.JWT_REFRESH_EXPIRES_IN,
      7 * 86_400_000,
    );
    this.graceSeconds = Math.min(
      30,
      Math.max(10, Number(process.env.REFRESH_GRACE_SECONDS ?? 30)),
    );
  }

  async register(registerDto: RegisterDto): Promise<Partial<User>> {
    const { email, password, identification_number } = registerDto;

    // Pesan konflik sengaja dibuat generik dan identik untuk email maupun
    // identification_number agar tidak membocorkan data mana yang sudah
    // terdaftar (mencegah user/account enumeration lewat endpoint register).
    const existingByEmail = await this.usersService.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictException('Data registrasi sudah terdaftar');
    }

    const existingById = await this.usersService.findByIdentificationNumber(
      identification_number,
    );
    if (existingById) {
      throw new ConflictException('Data registrasi sudah terdaftar');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const savedUser = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const result: Partial<User> = { ...savedUser };
    delete (result as { password?: string }).password;
    return result;
  }

  async login(
    loginDto: LoginDto,
  ): Promise<TokenPair & { user: Partial<User> }> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.signAccessToken(user);
    const refreshToken = generateRefreshToken();
    const now = new Date();

    await this.refreshSessionRepository.save(
      this.refreshSessionRepository.create({
        tokenHash: hashToken(refreshToken),
        user: { id: user.id },
        expiresAt: new Date(now.getTime() + this.refreshTtlMs),
      }),
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }

  async rotateRefreshTokenWithGracePeriod(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenHash = hashToken(refreshToken);

    // Lock baris sesi (FOR UPDATE) di dalam transaksi eksplisit. Tujuannya
    // mengurutkan request paralel yang memakai token yang sama: saat request
    // pertama selesai merotasi, request berikutnya yang menunggu lock akan
    // melihat token lama hanya sebagai previous_token_hash — sehingga bisa
    // dilayani lewat grace period tanpa race condition.
    return this.dataSource.transaction(async (manager) => {
      const now = new Date();
      const repo = manager.getRepository(RefreshSession);

      const session = await repo.findOne({
        where: [{ tokenHash }, { previousTokenHash: tokenHash }],
        lock: { mode: 'pessimistic_write' },
      });

      if (!session || session.revokedAt) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      if (session.expiresAt < now) {
        session.revokedAt = now;
        await repo.save(session);
        throw new UnauthorizedException('Expired refresh token');
      }

      // Ambil user_id tanpa JOIN relasi (hindari FOR UPDATE + outer join yang
      // ditolak PostgreSQL), lalu muat user aktif.
      // Ambil user_id lewat relasi (tanpa FOR UPDATE — query terpisah,
      // bebas masalah outer join), lalu muat user aktif.
      const sessionWithUser = await repo.findOne({
        where: { id: session.id },
        relations: { user: true },
      });

      let user: User | null = null;
      if (sessionWithUser?.user) {
        try {
          user = await this.usersService.findById(sessionWithUser.user.id);
        } catch {
          user = null;
        }
      }
      if (!user) {
        session.revokedAt = now;
        await repo.save(session);
        throw new UnauthorizedException('User no longer exists');
      }

      const accessToken = await this.signAccessToken(user);

      // Graceful reuse: request paralel yang masih membawa token hasil rotasi
      // sebelumnya → layani access token baru tanpa memutar ulang sesi.
      const isGracefulReuse =
        session.previousTokenHash === tokenHash &&
        session.graceExpiresAt !== null &&
        session.graceExpiresAt > now;
      if (isGracefulReuse) {
        return { accessToken, refreshToken };
      }

      // Replay setelah grace period berakhir → tanda sebagai deteksi reuse.
      const isReplay =
        session.previousTokenHash === tokenHash &&
        session.graceExpiresAt !== null &&
        session.graceExpiresAt <= now;
      if (isReplay) {
        session.revokedAt = now;
        await repo.save(session);
        throw new UnauthorizedException('Refresh token reuse detected');
      }

      // Rotasi normal: pindahkan hash lama ke previous, buat hash baru.
      const newRefreshToken = generateRefreshToken();
      session.previousTokenHash = session.tokenHash;
      session.tokenHash = hashToken(newRefreshToken);
      session.expiresAt = new Date(now.getTime() + this.refreshTtlMs);
      session.graceExpiresAt = new Date(
        now.getTime() + this.graceSeconds * 1000,
      );
      await repo.save(session);

      return { accessToken, refreshToken: newRefreshToken };
    });
  }

  async logout(refreshToken: string): Promise<void> {
    const session = await this.refreshSessionRepository.findOneBy({
      tokenHash: hashToken(refreshToken),
    });
    if (session) {
      await this.revoke(session);
    }
  }

  private async revoke(session: RefreshSession): Promise<void> {
    session.revokedAt = new Date();
    await this.refreshSessionRepository.save(session);
  }

  private async signAccessToken(user: {
    id: number;
    email: string;
    role: string;
  }): Promise<string> {
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}
