import { ArgsType, Field, HideField, Int } from '@nestjs/graphql';

import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { QueryOrderEnum } from '../enums';
import { DEFAULT_LIMIT } from '../util/consts';

@ArgsType()
export class RelayPaginationArgs<Node> {
  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  first?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  last?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  after?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  before?: string;

  @Field(() => QueryOrderEnum, { defaultValue: QueryOrderEnum.DESC })
  order: QueryOrderEnum;

  @Field(() => String, { nullable: true })
  @IsOptional()
  orderBy?: keyof Node;

  constructor(
    options: Partial<
      Omit<RelayPaginationArgs<Node>, 'hasCursor' | 'hasLast' | 'hasFirst'>
    > = {},
  ) {
    Object.assign(this, options);

    if (!this.first && !this.last) {
      this.first = DEFAULT_LIMIT;
    }
  }

  @HideField()
  public get hasCursor(): boolean {
    return !!this.after || !!this.before;
  }

  @HideField()
  public get hasLast(): boolean {
    return !!this.last;
  }

  @HideField()
  public get hasFirst(): boolean {
    return !!this.first;
  }
}
