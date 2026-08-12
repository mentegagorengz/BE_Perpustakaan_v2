import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Book } from './entities/book.entity';
import { BookItem } from './entities/book-item.entity';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { CreateBookItemDto } from './dto/create-item.dto';
import { Author } from '../authors/entities/author.entity';
import { Category } from '../categories/entities/category.entity';
import { Publisher } from '../publishers/entities/publisher.entity';
import { Language } from '../languages/entities/language.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  createPaginationMeta,
  PaginatedResult,
} from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book)
    private readonly bookRepository: Repository<Book>,
    @InjectRepository(BookItem)
    private readonly bookItemRepository: Repository<BookItem>,
    @InjectRepository(Author)
    private readonly authorRepository: Repository<Author>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Publisher)
    private readonly publisherRepository: Repository<Publisher>,
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
    private readonly dataSource: DataSource,
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

  async createMany(createBookDtos: CreateBookDto[]): Promise<Book[]> {
    if (createBookDtos.length === 0) return [];

    // 1. Kumpulkan ID unik untuk batch validation (anti N+1): 1 query per tabel.
    const categoryIds = [...new Set(createBookDtos.map((d) => d.category_id))];
    const publisherIds = [
      ...new Set(createBookDtos.map((d) => d.publisher_id)),
    ];
    const languageIds = [...new Set(createBookDtos.map((d) => d.language_id))];
    const authorIds = [...new Set(createBookDtos.flatMap((d) => d.author_ids))];

    const [categories, publishers, languages, authors] = await Promise.all([
      this.categoryRepository.findBy({ id: In(categoryIds) }),
      this.publisherRepository.findBy({ id: In(publisherIds) }),
      this.languageRepository.findBy({ id: In(languageIds) }),
      this.authorRepository.findBy({ id: In(authorIds) }),
    ]);

    assertAllFound('category', categories, categoryIds);
    assertAllFound('publisher', publishers, publisherIds);
    assertAllFound('language', languages, languageIds);
    assertAllFound('author', authors, authorIds);

    // 2. Atomic transaction: seluruh buku + relasi + join book_authors tersimpan
    //    bersama; kegagalan satu menyebabkan rollback semuanya.
    return this.dataSource.transaction(async (manager) => {
      const savedBooks: Book[] = [];
      for (const dto of createBookDtos) {
        const book = manager.create(Book, {
          title: dto.title,
          sub_title: dto.sub_title,
          isbn_13: dto.isbn_13,
          isbn_10: dto.isbn_10,
          published_year: dto.published_year,
          description: dto.description,
          category: { id: dto.category_id },
          publisher: { id: dto.publisher_id },
          language: { id: dto.language_id },
          authors: authors.filter((author) =>
            dto.author_ids.includes(author.id),
          ),
        });
        savedBooks.push(await manager.save(book));
      }
      return savedBooks;
    });
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
      meta: createPaginationMeta(page, limit, total),
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
      book.category = { id: category_id } as Category;
    }
    if (publisher_id) {
      book.publisher = { id: publisher_id } as Publisher;
    }
    if (language_id) {
      book.language = { id: language_id } as Language;
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
    // Soft delete: buku dihapus secara logis supaya riwayat transaksi tetap
    // utuh (FK violation dicegah). Eksemplar ikut dinonaktifkan soft-delete.
    await this.bookItemRepository.softDelete({ book: { id: book.id } });
    await this.bookRepository.softDelete(book.id);
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

function assertAllFound<T extends { id: number }>(
  label: string,
  found: T[],
  expectedIds: number[],
): void {
  const foundIds = new Set(found.map((item) => item.id));
  const missing = expectedIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new BadRequestException(
      `One or more ${label}(s) not found: ${missing.join(', ')}`,
    );
  }
}
