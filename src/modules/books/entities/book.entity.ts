import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { Category } from '../../categories/entities/category.entity';
import { Publisher } from '../../publishers/entities/publisher.entity';
import { Language } from '../../languages/entities/language.entity';
import { Author } from '../../authors/entities/author.entity';
import { BookItem } from './book-item.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  sub_title: string;

  @Column({ unique: true, nullable: true, length: 13 })
  isbn_13: string;

  @Column({ unique: true, nullable: true, length: 10 })
  isbn_10: string;

  @Column({ nullable: true })
  published_year: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  image_url: string;

  @ManyToOne(() => Category, (category) => category.books)
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @ManyToOne(() => Publisher, (publisher) => publisher.books)
  @JoinColumn({ name: 'publisher_id' })
  publisher: Publisher;

  @ManyToOne(() => Language)
  @JoinColumn({ name: 'language_id' })
  language: Language;

  @ManyToMany(() => Author, (author) => author.books)
  @JoinTable({
    name: 'book_authors',
    joinColumn: { name: 'book_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'author_id', referencedColumnName: 'id' },
  })
  authors: Author[];

  @OneToMany(() => BookItem, (item) => item.book)
  items: BookItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
