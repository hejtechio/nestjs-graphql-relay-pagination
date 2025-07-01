import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { TaskEventEntity } from './task-event.entity';
import { TaskTargetEntity } from './task-target.entity';

@ObjectType()
@Entity()
export class TaskEntity {
  @Field(() => ID)
  @PrimaryColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @Field()
  @Column()
  organizationId: string;

  @Field()
  @Column({ default: 'ACTIVE' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => TaskEventEntity, (event) => event.task)
  events: TaskEventEntity[];

  @OneToMany(() => TaskTargetEntity, (target) => target.task)
  targets: TaskTargetEntity[];
}
