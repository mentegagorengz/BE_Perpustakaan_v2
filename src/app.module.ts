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
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ArticlesModule } from './modules/articles/articles.module';

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
  ],
})
export class AppModule {}
