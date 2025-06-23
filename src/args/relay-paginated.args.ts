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

  /**
   * Factory method to create RelayPaginationArgs with proper defaults applied.
   * This ensures consistent behavior across NestJS versions and direct
   * service usage.
   */
  static create<Node>(
    options: Partial<
      Omit<RelayPaginationArgs<Node>, 'hasCursor' | 'hasLast' | 'hasFirst'>
    > = {},
  ): RelayPaginationArgs<Node> {
    const instance = new RelayPaginationArgs<Node>();

    // Filter out computed properties that are getters-only
    const { hasCursor, hasLast, hasFirst, ...safeOptions } = options as any;

    Object.assign(instance, safeOptions);

    // Apply default order if not provided (matches GraphQL defaultValue)
    if (!instance.order) {
      instance.order = QueryOrderEnum.DESC;
    }

    // Apply default 'first' value only if neither 'first' nor 'last'
    // is provided
    if (!instance.first && !instance.last) {
      instance.first = DEFAULT_LIMIT;
    }

    return instance;
  }
}
