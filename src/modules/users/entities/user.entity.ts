import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { SystemRole, UserCategory } from '../../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  // Unik hanya untuk data aktif (deleted_at IS NULL) via partial unique index
  // di migration — user terhapus boleh mendaftar ulang.
  @Column()
  identification_number: string;

  @Column()
  email: string;

  @Column({ select: false })
  password: string;

  @Column()
  full_name: string;

  @Column({
    type: 'enum',
    enum: SystemRole,
    default: SystemRole.USER,
  })
  role: SystemRole;

  @Column({
    type: 'enum',
    enum: UserCategory,
    default: UserCategory.STUDENT,
  })
  category: UserCategory;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
