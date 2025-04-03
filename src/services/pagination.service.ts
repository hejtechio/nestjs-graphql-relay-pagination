import { Inject, Injectable } from '@nestjs/common';
import {
  PaginationAdapter,
  PaginationResult,
  BasePaginationOptions,
} from '../pagination.interfaces';
import { PAGINATION_ADAPTER } from '../pagination.module';

/**
 * Service responsible for orchestrating pagination using a configured adapter.
 */
@Injectable()
export class PaginationService {
  constructor(
    @Inject(PAGINATION_ADAPTER) private readonly adapter: PaginationAdapter,
  ) {}

  /**
   * Paginates data using the configured adapter.
   *
   * @template TEntity The type of the entity being paginated.
   * @param options Options containing Relay arguments and adapter-specific settings (passed directly to the adapter).
   * @returns A promise resolving to the PaginationResult.
   */
  paginate<TEntity>(
    options: BasePaginationOptions<TEntity> & Record<string, any>,
  ): Promise<PaginationResult<TEntity>> {
    return this.adapter.paginate<TEntity>(options);
  }
}
