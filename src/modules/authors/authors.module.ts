// src/modules/authors/authors.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthorsService } from './authors.service';
import { AuthorsController } from './authors.controller';
import { Author } from './entities/author.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Author])], // Daftarkan Entity di sini
  controllers: [AuthorsController],
  providers: [AuthorsService],
  exports: [AuthorsService], // Export agar bisa dipakai di modul Books
})
export class AuthorsModule {}
