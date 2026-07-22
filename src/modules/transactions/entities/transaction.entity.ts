import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { BookItem } from '../../books/entities/book-item.entity';
import { ColumnNumericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => BookItem)
  @JoinColumn({ name: 'book_item_id' })
  bookItem: BookItem;

  @CreateDateColumn()
  borrowed_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  due_date: Date;

  @Column({ type: 'timestamp', nullable: true })
  returned_at: Date;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: new ColumnNumericTransformer(),
  })
  fine_amount: number;

  @Column({ default: 'BORROWED' })
  status: string; 
}
