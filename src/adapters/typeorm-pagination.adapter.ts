/* eslint-disable max-lines-per-function */
import { Injectable } from '@nestjs/common';
import { QueryOrderEnum } from 'src/enums/query-order.enum'; // TODO: Use path aliases if configured
import {
  PageInfo,
  PaginationEdge,
  PaginationResult,
  TypeOrmPaginationOptions,
} from 'src/pagination.interfaces'; // TODO: Use path aliases if configured
import { CursorService } from 'src/services/cursor.service'; // TODO: Use path aliases if configured
import { Repository } from 'typeorm';
import { BasePaginationAdapter } from './base-pagination.adapter';

@Injectable()
export class TypeOrmPaginationAdapter extends BasePaginationAdapter {
  // Extend base class

  constructor(private readonly cursorService: CursorService) {
    super(TypeOrmPaginationAdapter.name); // Call base constructor
  }

  async paginate<TEntity>(
    options: TypeOrmPaginationOptions<TEntity>,
  ): Promise<PaginationResult<TEntity>> {
    const {
      repository,
      args,
      queryBuilderCallback,
      primaryCursorColumn: primaryCursorColumnOption,
      defaultSortField: defaultSortFieldOption,
      defaultSortOrder = QueryOrderEnum.ASC,
      calculateTotalCount = false,
    } = options;

    // --- Initialization ---
    const alias = repository.metadata.name.toLowerCase(); // Or use a fixed alias like 'entity'
    let qb = repository.createQueryBuilder(alias);

    // Apply user customizations
    if (queryBuilderCallback) {
      qb = queryBuilderCallback(qb);
    }

    // Determine primary key and default sort column from metadata if not provided
    const primaryCursorColumn =
      primaryCursorColumnOption ?? this.getIdColumnPropertyName(repository);
    const sortField =
      defaultSortFieldOption ?? this.getDateColumnPropertyName(repository);

    if (!primaryCursorColumn) {
      throw new Error(
        "Could not determine primary cursor column (typically 'id'). Please provide primaryCursorColumn in options.",
      );
    }
    if (!sortField) {
      throw new Error(
        'Could not determine default sort field (typically createdAt/updatedAt). Please provide defaultSortField in options.',
      );
    }

    // Convert to string explicitly for use in template literals and comparisons
    const primaryCursorColumnString = String(primaryCursorColumn);
    const sortFieldString = String(sortField);

    // --- Decode Cursors ---
    const cursor = args.before ?? args.after;
    const decodedCursor = cursor
      ? this.cursorService.decode(cursor)
      : undefined;
    const pagingDirection = this.getPagingDirection(args); // Use base helper

    // --- Apply Sorting ---
    const effectiveSortOrder = this.getEffectiveSortOrder(
      defaultSortOrder,
      args,
    ); // Use base helper

    qb.orderBy(`${alias}.${sortFieldString}`, effectiveSortOrder);
    if (sortFieldString !== primaryCursorColumnString) {
      qb.addOrderBy(
        `${alias}.${primaryCursorColumnString}`,
        effectiveSortOrder,
      );
    }

    // --- Apply Cursor Filtering (WHERE clause) ---
    if (decodedCursor) {
      const comparisonOperator = this.getComparisonOperator(
        effectiveSortOrder,
        pagingDirection,
      ); // Use base helper
      const parameters: { [key: string]: any } = {};
      let whereClause = '';

      // Build WHERE clause for cursor pagination (handles multi-column sort)
      if (
        decodedCursor.orderBy !== undefined &&
        sortFieldString !== primaryCursorColumnString
      ) {
        // Multi-column cursor (orderBy field + primary key)
        parameters.cursorOrderBy = decodedCursor.orderBy;
        parameters.cursorId = decodedCursor.id;
        whereClause = `(
          (${alias}.${sortFieldString} ${comparisonOperator} :cursorOrderBy) OR
          (${alias}.${sortFieldString} = :cursorOrderBy AND ${alias}.${primaryCursorColumnString} ${comparisonOperator} :cursorId)
        )`;
      } else {
        // Single-column cursor (primary key only)
        parameters.cursorId = decodedCursor.id;
        whereClause = `${alias}.${primaryCursorColumnString} ${comparisonOperator} :cursorId`;
      }
      qb.andWhere(whereClause, parameters);
    }

    // --- Apply Limit ---
    const limit = args.first ?? args.last ?? 20; // Default limit if none provided
    qb.take(limit + 1); // Fetch one extra record to determine hasNextPage/hasPreviousPage

    // --- Fetch Data ---
    // Temporarily cast `qb.expressionMap.wheres` to `any` to bypass complex TypeORM type issue for count.
    // A better solution might involve constructing a simpler FindOptionsWhere manually if possible.
    const countOptions = calculateTotalCount
      ? { where: qb.expressionMap.wheres as any }
      : undefined;

    const [entitiesIncludingExtra, totalCount] = await Promise.all([
      qb.getMany(),
      countOptions
        ? repository.count(countOptions)
        : Promise.resolve(undefined), // Fetch total count conditionally
    ]);

    // --- Determine PageInfo ---
    const hasMore = entitiesIncludingExtra.length > limit;
    const entities = hasMore
      ? entitiesIncludingExtra.slice(0, limit)
      : entitiesIncludingExtra;

    if (args.last) {
      entities.reverse();
    }

    const hasNextPage = args.last ? !!args.before : hasMore;
    const hasPreviousPage = args.first ? !!args.after : hasMore;

    // --- Create Edges with Cursors ---
    const edges: PaginationEdge<TEntity>[] = entities.map((entity) => {
      // ASSUMPTION: CursorService has encodeFromParts or similar method added.
      // If not, this needs adjustment based on CursorService API.
      if (!this.cursorService.encodeFromParts) {
        this.logger.warn(
          `CursorService does not have 'encodeFromParts'. Falling back to basic encoding.`,
        );
        // Provide a fallback or throw an error
        return {
          node: entity,
          cursor: this.cursorService.encodeId(
            String(entity[primaryCursorColumn as keyof TEntity]),
          ),
        };
      }
      return {
        node: entity,
        cursor: this.cursorService.encodeFromParts(
          entity[primaryCursorColumn as keyof TEntity], // Cast to keyof TEntity
          entity[sortField as keyof TEntity], // Cast to keyof TEntity
        ),
      };
    });

    const pageInfo: PageInfo = {
      hasNextPage,
      hasPreviousPage,
      startCursor: edges[0]?.cursor ?? undefined, // Use undefined instead of null
      endCursor: edges.at(-1)?.cursor ?? undefined, // Use undefined instead of null
    };

    // --- Return Result ---
    this.warnIfFieldsNotIndexed(repository, [
      sortFieldString,
      primaryCursorColumnString,
    ]);

    return {
      edges,
      pageInfo,
      totalCount,
    };
  }

  // --- Helper Methods (Specific to TypeORM Adapter) ---

  private getDateColumnPropertyName(
    repository: Repository<any>,
  ): string | undefined {
    return (
      repository.metadata.createDateColumn?.propertyName ??
      repository.metadata.updateDateColumn?.propertyName
    );
  }

  private getIdColumnPropertyName(
    repository: Repository<any>,
  ): string | undefined {
    return repository.metadata.primaryColumns[0]?.propertyName;
  }

  private warnIfFieldsNotIndexed(
    repository: Repository<any>,
    fieldsUsed: string[],
  ): void {
    const indexedColumns = new Set<string>([
      ...repository.metadata.indices.flatMap((index) =>
        index.columns.map((col) => col.propertyName),
      ),
      ...repository.metadata.primaryColumns.map((col) => col.propertyName),
      ...repository.metadata.uniques.flatMap((unique) =>
        unique.columns.map((col) => col.propertyName),
      ),
    ]);

    const unindexedFields = fieldsUsed.filter(
      (field) => field && !indexedColumns.has(field),
    );

    if (unindexedFields.length > 0) {
      this.logger.warn(
        `For table "${repository.metadata.tableName}", the following fields used for pagination are not optimally indexed: [${unindexedFields.join(', ')}]
         Consider adding a composite index for optimal performance, e.g., CREATE INDEX idx_${repository.metadata.tableName}_pagination ON "${repository.metadata.tableName}" ("${fieldsUsed.filter(Boolean).join('", "')}");`,
      );
    }
  }
  // Removed getComparisonOperator and reverseOrder - they are now in BasePaginationAdapter
}
