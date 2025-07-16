import { ArgsType, Field, HideField, Int } from '@nestjs/graphql';

import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { DEFAULT_LIMIT } from '../util/consts';

/**
 * Base arguments class for Relay-style cursor-based pagination.
 *
 * ## Ordering Behavior
 * This class intentionally does NOT include ordering parameters. The pagination
 * system automatically handles ordering through the following mechanisms:
 *
 * 1. **Automatic Detection**: The QueryService detects existing
 *    `orderBy` clauses from your TypeORM QueryBuilder and uses them for
 *    stable cursor-based pagination.
 *
 * 2. **Smart Fallbacks**: When no explicit ordering is specified, the system
 *    falls back to:
 *    - `createdAt` field (if available)
 *    - Primary key field (usually `id`)
 *    - Throws an error if neither is available
 *
 * 3. **Cursor Stability**: The ordering field is automatically included in
 *    cursor encoding to ensure stable pagination even when multiple records
 *    have the same sort value.
 *
 * ## Custom Ordering
 * For entity-specific ordering requirements, extend this class:
 *
 * ```typescript
 * @ArgsType()
 * export class TaskArgs extends RelayPaginationArgs {
 *   @Field(() => TaskOrderBy, { nullable: true })
 *   orderBy?: TaskOrderBy;
 * }
 * ```
 *
 * Then apply the ordering in your resolver before calling the pagination
 * service:
 *
 * ```typescript
 * const queryBuilder = repository.createQueryBuilder('task');
 * if (args.orderBy) {
 *   queryBuilder.orderBy(`task.${args.orderBy.field}`, args.orderBy.direction);
 * }
 * ```
 *
 * This approach maintains type safety and separation of concerns while
 * leveraging the automatic ordering detection system.
 */
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
