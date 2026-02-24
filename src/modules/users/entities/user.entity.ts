import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SystemRole, UserCategory } from '../../../common/enums/role.enum';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  identification_number: string;

  @Column({ unique: true })
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
}
