import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CacheModule } from '@nestjs/cache-manager';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { AuthorsModule } from './modules/authors/authors.module';
import { PublishersModule } from './modules/publishers/publishers.module';
import { LanguagesModule } from './modules/languages/languages.module';
import { BooksModule } from './modules/books/books.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import databaseConfig from './config/database.config';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { PolicyModule } from './modules/policy/policy.module';
import { HealthModule } from './modules/health/health.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ActivityLogInterceptor } from './common/interceptors/activity-logs.interceptor';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    // Rate-limit global (default 100 req / menit / IP). Override ketat di /auth/login.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // Event bus untuk audit log async dan event internal lain.
    EventEmitterModule.forRoot(),
    // In-memory cache (dashboard read query, TTL 60 detik di level service).
    CacheModule.register({ isGlobal: true, ttl: 60_000 }),
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
    HealthModule,
  ],
  providers: [
    // Global guard / interceptor / filter terdaftar via DI container (APP_*),
    // bukan instansiasi manual di main.ts (100% DI compliance).
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ActivityLogInterceptor },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
