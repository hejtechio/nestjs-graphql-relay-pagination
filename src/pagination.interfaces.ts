import {
  SelectQueryBuilder as TypeOrmSelectQueryBuilder,
  Repository as TypeOrmRepository,
} from 'typeorm';
import { RelayPaginationArgs } from './args/relay-paginated.args';
import { QueryOrderEnum } from './enums/query-order.enum';

/**
 * Represents a single edge in a Relay connection.
 */
export interface PaginationEdge<TEntity> {
  node: TEntity;
  cursor: string;
}

/**
 * Represents the PageInfo object in a Relay connection.
 */
export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor: string | null;
  endCursor: string | null;
}

/**
 * The result object returned by the pagination adapter.
 */
export interface PaginationResult<TEntity> {
  edges: PaginationEdge<TEntity>[];
  pageInfo: PageInfo;
  totalCount?: number; // Optional: Total count of items across all pages
}

/**
 * Base options required by any pagination adapter.
 */
export interface BasePaginationOptions<TEntity> {
  args: RelayPaginationArgs<TEntity>;
  primaryCursorColumn?: keyof TEntity | string; // Defaults to 'id' or adapter's discovery
  defaultSortField?: keyof TEntity | string; // Defaults to creation timestamp or adapter's discovery
  defaultSortOrder?: QueryOrderEnum; // Defaults to ASC
  calculateTotalCount?: boolean; // Whether to calculate totalCount (can be expensive)
}

/**
 * Specific options for the TypeORM Pagination Adapter.
 */
export interface TypeOrmPaginationOptions<TEntity>
  extends BasePaginationOptions<TEntity> {
  repository: TypeOrmRepository<TEntity>;
  queryBuilderCallback?: (
    qb: TypeOrmSelectQueryBuilder<TEntity>,
  ) => TypeOrmSelectQueryBuilder<TEntity>;
}

/**
 * Interface defining the contract for a pagination adapter.
 * Adapters are responsible for fetching data according to Relay spec
 * using a specific ORM or data source.
 */
export interface PaginationAdapter {
  /**
   * Fetches paginated data based on the provided options.
   * @param options Options including Relay arguments and adapter-specific settings.
   */
  paginate<TEntity>(
    options: BasePaginationOptions<TEntity> & Record<string, any>,
  ): Promise<PaginationResult<TEntity>>;
}
