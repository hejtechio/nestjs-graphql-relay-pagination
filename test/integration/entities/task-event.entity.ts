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

@ObjectType()
@Entity()
export class TaskEventEntity {
  @Field(() => ID)
  @PrimaryColumn('uuid')
  id: string;

  @Field()
  @Column()
  taskId: string;

  @Field()
  @Column()
  eventType: string;

  @Field()
  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => TaskEntity, (task) => task.events)
  @JoinColumn({ name: 'taskId' })
  task: TaskEntity;
}
