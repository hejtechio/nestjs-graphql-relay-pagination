import { Field, ID, ObjectType } from '@nestjs/graphql';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@ObjectType()
@Entity()
export class TestEntity {
  @Field(() => ID)
  @PrimaryColumn('uuid')
  id: string;

  @Field()
  @Column()
  name: string;

  @CreateDateColumn()
  createdAt: Date;
}
