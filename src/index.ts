// Export all public interfaces and types
export * from './interfaces/relay-paginated.interface';
export * from './entities/pagination-result.entity';
export * from './entities/page-info.entity';
export * from './entities/paginated.entity';
export * from './args/relay-paginated.args';

// Export decorators
export * from './decorators/pagination-service.decorator';

// Export services
export * from './services/cursor.service';
export * from './services/pagination.service';
export * from './services/pagination-service.builder';
export * from './services/query.service';
export * from './services/relay.service';

// Export module
export * from './pagination.module';

// Export enums
export * from './enums';

// Export decorators
export * from './decorators';

// Export enums
export * from './enums/query-order.enum';

// Export utils
export * from './util/consts';

// Export factories
export * from './factories/pagination.factory';

// --- Core --- //
export {
  PaginationModule,
  PaginationModuleOptions,
  PAGINATION_ADAPTER,
} from './pagination.module';
export { PaginationService } from './services/pagination.service';

// --- Interfaces --- //
export {
  PaginationAdapter,
  PaginationEdge,
  PageInfo,
  PaginationResult,
  BasePaginationOptions,
  TypeOrmPaginationOptions,
} from './pagination.interfaces';

// --- Adapters --- //
export { TypeOrmPaginationAdapter } from './adapters/typeorm-pagination.adapter';
export { BasePaginationAdapter } from './adapters/base-pagination.adapter';

// --- Arguments --- //
export { RelayPaginationArgs } from './args/relay-paginated.args';

// --- Enums --- //
export { QueryOrderEnum } from './enums/query-order.enum';

// --- GraphQL Types --- //
// It's often better to let users define these in their own app scope
// using the helper functions or directly, but exporting helpers can be useful.
// export { Connection } from './gql/connection.type';
// export { Edge } from './gql/edge.type';
// export { PageInfoObject } from './gql/page-info.type';

// --- Deprecated / To be removed --- //
// export { CursorService } from './services/cursor.service'; // Internal service, not typically needed by users
// export { PaginationFactory } from './factories/pagination.factory'; // Replaced by module register
// export { QueryService } from './services/query.service'; // Replaced by adapter
// export { RelayService } from './services/relay.service'; // Internal logic, likely removed/merged
// export { Cursor } from './entities/cursor.entity'; // Internal detail
// export { CursorFields } from './entities/cursor-fields.entity'; // Internal detail
