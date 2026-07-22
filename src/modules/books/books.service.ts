import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like } from 'typeorm';
import { Book } from './entities/book.entity';
import { BookItem } from './entities/book-item.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateBookItemDto } from './dto/create-item.dto';
import { Author } from '../authors/entities/author.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(BookItem)
    private readonly bookItemRepository: Repository<BookItem>,
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
  ) {}

  async create(createBookDto: CreateBookDto): Promise<Book> {
    const { author_ids, category_id, publisher_id, language_id, ...bookData } =
      createBookDto;

    const authors = await this.authorRepository.findBy({
      id: In(author_ids),
    });

    if (authors.length !== author_ids.length) {
      throw new NotFoundException('One or more authors not found');
    }

    const book = this.bookRepository.create({
      ...bookData,
      category: { id: category_id },
      publisher: { id: publisher_id },
      language: { id: language_id },
      authors: authors,
    });

    return this.bookRepository.save(book);
  }

  async createMany(booksDto: CreateBookDto[]): Promise<Book[]> {
    const books = this.bookRepository.create(booksDto);
    return await this.bookRepository.save(books);
  }

  async findAll(paginationDto: PaginationDto): Promise<PaginatedResult<Book>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const queryBuilder = this.bookRepository
      .createQueryBuilder('book')
      .leftJoinAndSelect('book.category', 'category')
      .leftJoinAndSelect('book.authors', 'author')
      .leftJoinAndSelect('book.publisher', 'publisher')
      .leftJoinAndSelect('book.language', 'language')
      .orderBy('book.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (search) {
      queryBuilder.where(
        'book.title ILIKE :search OR book.isbn_13 ILIKE :search OR author.name ILIKE :search',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number): Promise<Book> {
    const book = await this.bookRepository.findOne({
      where: { id },
      relations: ['category', 'authors', 'publisher', 'language', 'items'],
    });
    if (!book) {
      throw new NotFoundException(`Book with ID ${id} not found`);
    }
    return book;
  }

  async update(id: number, updateBookDto: UpdateBookDto): Promise<Book> {
    const book = await this.findOne(id);
    const { author_ids, category_id, publisher_id, language_id, ...bookData } =
      updateBookDto;

    Object.assign(book, bookData);

    if (category_id) {
      book.category = { id: category_id } as any;
    }
    if (publisher_id) {
      book.publisher = { id: publisher_id } as any;
    }
    if (language_id) {
      book.language = { id: language_id } as any;
    }
    if (author_ids && author_ids.length > 0) {
      const authors = await this.authorRepository.findBy({
        id: In(author_ids),
      });
      if (authors.length !== author_ids.length) {
        throw new NotFoundException('One or more authors not found');
      }
      book.authors = authors;
    }

    return this.bookRepository.save(book);
  }

  async remove(id: number): Promise<void> {
    const book = await this.findOne(id);
    await this.bookRepository.remove(book);
  }

  async createItem(createBookItemDto: CreateBookItemDto): Promise<BookItem> {
    const { book_id, ...itemData } = createBookItemDto;

    const book = await this.bookRepository.findOneBy({ id: book_id });
    if (!book) {
      throw new NotFoundException(`Book with ID ${book_id} not found`);
    }

    const newItem = this.bookItemRepository.create({
      ...itemData,
      book: book,
    });

    return this.bookItemRepository.save(newItem);
  }

  async findAllItems(bookId: number): Promise<BookItem[]> {
    return this.bookItemRepository.find({
      where: { book: { id: bookId } },
      relations: ['book'],
    });
  }
}
