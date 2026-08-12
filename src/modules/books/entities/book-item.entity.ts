import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { ApiHideProperty } from '@nestjs/swagger';
import { Book } from './book.entity';
import { BookStatus, BookCondition } from '../../../common/enums/book.enum';

@Entity('book_items')
export class BookItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  barcode: string;

  @Column({
    type: 'enum',
    enum: BookStatus,
    default: BookStatus.AVAILABLE,
  })
  status: BookStatus;

  @Column({
    type: 'enum',
    enum: BookCondition,
    default: BookCondition.GOOD,
  })
  condition: BookCondition;

  @ManyToOne(() => Book, (book) => book.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @CreateDateColumn()
  added_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ApiHideProperty()
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
