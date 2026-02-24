// src/modules/books/entities/book-item.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Book } from './book.entity';

@Entity('book_items')
export class BookItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  barcode: string;

  @Column({
    type: 'enum',
    enum: ['AVAILABLE', 'RESERVED', 'BORROWED', 'LOST', 'DAMAGED'],
    default: 'AVAILABLE',
  })
  status: string;

  @Column({
    type: 'enum',
    enum: ['BAIK', 'RUSAK_RINGAN', 'RUSAK_BERAT'],
    default: 'BAIK',
  })
  condition: string;

  @ManyToOne(() => Book, (book) => book.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @CreateDateColumn()
  added_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
