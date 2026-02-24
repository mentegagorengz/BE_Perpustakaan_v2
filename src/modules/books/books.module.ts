import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BooksService } from './books.service';
import { BooksController } from './books.controller';
import { Book } from './entities/book.entity';
import { BookItem } from './entities/book-item.entity';
import { Author } from '../authors/entities/author.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book, BookItem, Author])],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
