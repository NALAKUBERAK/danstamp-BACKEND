import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('password_reset_token')
export class PasswordResetToken {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'id_usuario' })
  user: User;

  @Column({ type: 'char', length: 64, unique: true })
  token_hash: string;

  @Column({ type: 'datetime' })
  expires_at: Date;

  @CreateDateColumn({ type: 'datetime' })
  created_at: Date;
}
