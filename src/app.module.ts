import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AuthorsModule } from './modules/authors/authors.module';
import { PublishersModule } from './modules/publishers/publishers.module';
import { LanguagesModule } from './modules/languages/languages.module';
import { BooksModule } from './modules/books/books.module'; // 1. Tambahkan Import ini
import { TransactionsModule } from './modules/transactions/transactions.module';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        return configService.get<TypeOrmModuleOptions>('database', {});
      },
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    AuthorsModule,
    PublishersModule,
    LanguagesModule,
    BooksModule,
    TransactionsModule, // 2. Daftarkan di sini
  ],
})
export class AppModule {}
