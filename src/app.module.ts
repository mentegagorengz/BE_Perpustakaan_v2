import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { PolicyModule } from './modules/policy/policy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    // Rate-limit global (default 100 req / menit / IP). Override ketat di /auth/login.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        return configService.get<TypeOrmModuleOptions>('database', {});
      },
    }),
    ActivityLogsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    AuthorsModule,
    PublishersModule,
    LanguagesModule,
    BooksModule,
    TransactionsModule,
    DashboardModule,
    ArticlesModule,
    PolicyModule,
  ],
  providers: [
    // Terapkan ThrottlerGuard ke semua route secara global.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
