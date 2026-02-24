import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Book } from '../../books/entities/book.entity';

@Entity('categories')
export class Category {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ unique: true, length: 100 })
    name: string;

    @OneToMany(() => Book, (book) => book.category)
    books: Book[];
}
