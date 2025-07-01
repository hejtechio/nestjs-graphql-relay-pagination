import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { TaskEntity } from './task.entity';

export enum TaskTargetType {
  CLIENT = 'CLIENT',
  USER = 'USER',
  DEPARTMENT = 'DEPARTMENT',
}

@ObjectType()
@Entity()
export class TaskTargetEntity {
  @Field(() => ID)
  @PrimaryColumn('uuid')
  id: string;

  @Field()
  @Column()
  taskId: string;

  @Field()
  @Column()
  targetId: string;

  @Field()
  @Column({
    type: 'varchar',
    enum: TaskTargetType,
    default: TaskTargetType.CLIENT,
  })
  targetType: TaskTargetType;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => TaskEntity, (task) => task.targets)
  @JoinColumn({ name: 'taskId' })
  task: TaskEntity;
}
