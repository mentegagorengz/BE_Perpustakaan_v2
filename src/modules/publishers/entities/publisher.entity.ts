import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Book } from '../../books/entities/book.entity';

@Entity('publishers')
export class Publisher {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 255 }) // Sesuaikan length dengan skrip SQL kamu
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @OneToMany(() => Book, (book) => book.publisher)
  books: Book[];
}
