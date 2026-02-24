import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<Partial<User>> {
    const { email, password, identification_number } = registerDto;

    // Cek apakah email sudah terdaftar
    const existingByEmail = await this.usersService.findByEmail(email);
    if (existingByEmail) {
      throw new ConflictException('Email already exists');
    }

    // Cek apakah identification_number sudah terdaftar
    const existingById = await this.usersService.findByIdentificationNumber(
      identification_number,
    );
    if (existingById) {
      throw new ConflictException('Identification number already exists');
    }

    // Hash password sebelum disimpan
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Buat user baru (role otomatis USER dari entity default)
    const savedUser = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    // Hapus password dari response
    const { password: _, ...result } = savedUser;
    return result;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Cari user berserta password-nya (pakai QueryBuilder yang kamu buat di UsersService)
    const user = await this.usersService.findByEmailWithPassword(email);

    // 2. Verifikasi User & Password
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Siapkan Payload (data yang disimpan di dalam token)
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    // 4. Return token dan data user minimalis
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        full_name: user.full_name,
        role: user.role,
      },
    };
  }
}
