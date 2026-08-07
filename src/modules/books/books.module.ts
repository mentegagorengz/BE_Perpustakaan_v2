import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { Book } from './entities/book.entity';
import { BookItem } from './entities/book-item.entity';
import { Author } from '../authors/entities/author.entity';
import { Category } from '../categories/entities/category.entity';
import { Publisher } from '../publishers/entities/publisher.entity';
import { Language } from '../languages/entities/language.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Book,
      BookItem,
      Author,
      Category,
      Publisher,
      Language,
    ]),
  ],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
