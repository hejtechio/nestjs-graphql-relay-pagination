import { ArgsType, Field, HideField, Int } from '@nestjs/graphql';

import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DEFAULT_LIMIT } from '../util/consts';

@ArgsType()
export class RelayPaginationArgs<_Node = any> {
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
  static create<_Node = any>(
    options: Partial<
      Omit<RelayPaginationArgs<_Node>, 'hasCursor' | 'hasLast' | 'hasFirst'>
    > = {},
  ): RelayPaginationArgs<_Node> {
    const instance = new RelayPaginationArgs<_Node>();

    // Filter out computed properties that are getters-only
    const { hasCursor, hasLast, hasFirst, ...safeOptions } = options as any;

    Object.assign(instance, safeOptions);

    // Apply default 'first' value only if neither 'first' nor 'last'
    // is provided
    if (!instance.first && !instance.last) {
      instance.first = DEFAULT_LIMIT;
    }

    return instance;
  }
}
