import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  action: string; // CREATE, UPDATE, DELETE, LOGIN, ACCESS_PAGE

  @Column()
  module: string;

  @Column({ type: 'text', nullable: true })
  details: string;

  @Column({ nullable: true })
  ip_address: string;

  @Column({ type: 'text', nullable: true })
  device_info: string;

  @Column({ default: 'SUCCESS' })
  status: string; // SUCCESS atau FAILED

  @CreateDateColumn()
  created_at: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
