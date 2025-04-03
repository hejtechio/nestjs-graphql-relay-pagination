import { Logger } from '@nestjs/common';
import { RelayPaginationArgs } from 'src/args/relay-paginated.args';
import { QueryOrderEnum } from 'src/enums/query-order.enum';
import {
  BasePaginationOptions,
  PaginationAdapter,
  PaginationResult,
} from 'src/pagination.interfaces';

/**
 * Defines the direction of pagination.
 */
export enum PagingDirection {
  Forward = 'FORWARD',
  Backward = 'BACKWARD',
  None = 'NONE',
}

/**
 * Abstract base class for pagination adapters,
 * providing common helper methods.
 */
export abstract class BasePaginationAdapter implements PaginationAdapter {
  protected readonly logger: Logger;

  constructor(adapterName: string) {
    this.logger = new Logger(adapterName);
  }

  /**
   * Determines the comparison operator ('>' or '<') based on the sort order
   * and whether pagination is happening from the 'before' cursor.
   *
   * @param order The effective sort order (ASC or DESC).
   * @param pagingDirection Indicates if paging forward, backward, or from the start.
   * @returns Comparison operator '>' or '<'.
   */
  protected getComparisonOperator(
    order: QueryOrderEnum,
    pagingDirection: PagingDirection,
  ): '>' | '<' {
    if (pagingDirection === PagingDirection.None) {
      // Should not happen if called correctly, but handle defensively
      return order === QueryOrderEnum.ASC ? '>' : '<';
    }

    const isPagingBefore = pagingDirection === PagingDirection.Backward;

    if (order === QueryOrderEnum.ASC) {
      return isPagingBefore ? '<' : '>';
    }
    // DESC
    return isPagingBefore ? '>' : '<';
  }

  /**
   * Reverses the given query order.
   *
   * @param order The original order (ASC or DESC).
   * @returns The reversed order (DESC or ASC).
   */
  protected reverseOrder(order: QueryOrderEnum): QueryOrderEnum {
    return order === QueryOrderEnum.ASC
      ? QueryOrderEnum.DESC
      : QueryOrderEnum.ASC;
  }

  /**
   * Determines the effective sort order based on default order and pagination args.
   * If paginating backwards (`last` is set), the default order is reversed.
   *
   * @param defaultSortOrder The default sort order.
   * @param args The Relay pagination arguments.
   * @returns The effective sort order to apply to the query.
   */
  protected getEffectiveSortOrder<TEntity>(
    defaultSortOrder: QueryOrderEnum,
    args: RelayPaginationArgs<TEntity>,
  ): QueryOrderEnum {
    return args.last ? this.reverseOrder(defaultSortOrder) : defaultSortOrder;
  }

  /**
   * Determines the direction of pagination based on arguments.
   *
   * @param args The Relay pagination arguments.
   * @returns The direction of pagination.
   */
  protected getPagingDirection<TEntity>(
    args: RelayPaginationArgs<TEntity>,
  ): PagingDirection {
    if (args.before) return PagingDirection.Backward;
    if (args.after) return PagingDirection.Forward;
    // If neither before nor after is set, treat 'first' as forward and 'last' as backward from the start/end respectively.
    // Although standard Relay usually uses cursors for this, we need a direction for the comparison operator.
    if (args.last) return PagingDirection.Backward;
    return PagingDirection.Forward; // Default to forward if only 'first' or nothing is specified.
  }

  /**
   * Abstract paginate method to be implemented by concrete adapters.
   */
  abstract paginate<TEntity>(
    options: BasePaginationOptions<TEntity> & Record<string, any>,
  ): Promise<PaginationResult<TEntity>>;
}
