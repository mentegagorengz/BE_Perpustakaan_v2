import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { ColumnNumericTransformer } from '../../../common/transformers/numeric.transformer';

@Entity('policy')
export class Policy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 5000,
    transformer: new ColumnNumericTransformer(),
  })
  fine_per_day: number;

  @Column({ type: 'int', default: 7 })
  loan_duration_days: number;

  @Column({ type: 'int', default: 3 })
  max_books_per_user: number;
}
