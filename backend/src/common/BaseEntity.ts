import { Exclude } from 'class-transformer';
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  BaseEntity as TypeORMBaseEntity,
  DeleteDateColumn,
} from 'typeorm';

export abstract class BaseEntity extends TypeORMBaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ type: 'timestamp without time zone', name: "created-at" })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp without time zone', name: "updated-at" })
  updatedAt: Date;

  @Exclude()
  @DeleteDateColumn({ type: 'timestamp without time zone', name: "deleted-at"})
  deletedAt?: Date;
}