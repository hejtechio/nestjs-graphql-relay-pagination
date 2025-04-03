# nestjs-graphql-relay-pagination

A flexible pagination module for NestJS GraphQL applications following the Relay cursor pagination specification.

## Installation

```bash
npm install nestjs-graphql-relay-pagination
```

## Features

- Cursor-based pagination following the Relay specification
- Works with NestJS and GraphQL
- **Uses a decoupled adapter pattern (currently supporting TypeORM)**
- Customizable cursor encoding/decoding
- Support for filtering and sorting via TypeORM QueryBuilder
- Easy integration with existing NestJS applications

## Usage

### 1. Configure the Module

Import and register the `PaginationModule` in your application module (e.g., `AppModule`). The module uses the `TypeOrmPaginationAdapter` by default.

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm'; // Assuming you use TypeORM
import { PaginationModule } from 'nestjs-graphql-relay-pagination';
import { YourEntity } from './your-entity.entity'; // Your TypeORM entity

@Module({
  imports: [
    // Your TypeOrmModule setup
    TypeOrmModule.forRoot({
      /* ... */
    }),
    TypeOrmModule.forFeature([YourEntity]), // Make repository available for injection

    // Register the PaginationModule (defaults to TypeOrmPaginationAdapter)
    PaginationModule.register(),
    // other modules...
  ],
})
export class AppModule {}
```

_Note: Although the adapter pattern is in place, currently only the `TypeOrmPaginationAdapter` is provided and tested. If you need to use a different adapter in the future, you can provide it via `PaginationModule.register({ adapter: YourCustomAdapter })`._

### 2. Use in your Resolvers

Inject the `PaginationService` and use its `paginate` method within your GraphQL resolvers.

```typescript
import { Resolver, Query, Args, ObjectType } from '@nestjs/graphql';
import {
  PaginationService,
  RelayPaginatedArgs,
  Connection,
  TypeOrmPaginationOptions, // Import adapter-specific options type
} from 'nestjs-graphql-relay-pagination';
import { YourEntity } from './your-entity.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';

// Define the Connection type for your entity
@ObjectType()
export class YourEntityConnection extends Connection(YourEntity) {}

@Resolver(() => YourEntity)
export class YourResolver {
  constructor(
    private readonly paginationService: PaginationService,
    @InjectRepository(YourEntity)
    private readonly yourEntityRepository: Repository<YourEntity>,
  ) {}

  @Query(() => YourEntityConnection)
  async findAll(
    @Args() args: RelayPaginatedArgs<YourEntity>,
  ): Promise<YourEntityConnection> {
    // Define options specifically for the TypeOrmPaginationAdapter
    const paginationOptions: TypeOrmPaginationOptions<YourEntity> = {
      args,
      repository: this.yourEntityRepository,
      queryBuilderCallback: (qb: SelectQueryBuilder<YourEntity>) => {
        // Optional: Customize the TypeORM query builder
        // Add filters, joins, etc.
        // qb.andWhere('entity.isActive = :isActive', { isActive: true });
        // IMPORTANT: Return the query builder instance
        return qb;
      },
      // Optional: Specify primary key column if not 'id'
      // primaryCursorColumn: 'uuid',
      // Optional: Specify default sort field if not create/update timestamp
      // defaultSortField: 'name',
      // Optional: Calculate total count (can impact performance)
      // calculateTotalCount: true,
    };

    return this.paginationService.paginate<YourEntity>(paginationOptions);
  }
}
```

## Adapters

The core pagination logic is decoupled from TypeORM through an adapter interface (`PaginationAdapter`). This pattern allows for potential future support of other ORMs or data sources by creating new adapters.

Currently, the library includes and defaults to `TypeOrmPaginationAdapter`.

### Adapter Responsibilities

An adapter is responsible for:

1.  **Fetching Data**: Retrieving slices of data based on cursors (`before`, `after`) and limits (`first`, `last`) using the specific ORM (TypeORM).
2.  **Counting**: Optionally determining the total count of items.
3.  **Cursor Handling**: Delegating cursor encoding/decoding to the internal `CursorService`.
4.  **Filtering/Sorting**: Applying filtering and sorting using the ORM's QueryBuilder, potentially customized via the `queryBuilderCallback`.

### Creating a Custom Adapter

(Documentation for creating custom adapters for other data sources is currently TBD, as the focus is on TypeORM.)

## Development

### Running the tests

This package includes both unit tests and integration tests. The integration tests require a running instance of CockroachDB, which is provided via Docker Compose.

To run the unit tests:

```bash
npm test
```

To run the integration tests:

1. Start the required services:

```bash
npm run docker:up
```

2. Run the integration tests:

```bash
npm run test:int
```

3. When done, shut down the services:

```bash
npm run docker:down
```

## API Documentation

### `PaginationModule.register(options?: PaginationModuleOptions)`

Static method to register the module. `options.adapter` can be used to provide a custom adapter class (defaults to `TypeOrmPaginationAdapter`).

### `PaginationService`

The main service injected into resolvers. Its `paginate(options)` method orchestrates pagination by calling the configured adapter.

### `PaginationAdapter` Interface

The interface defining the contract for pagination adapters.

### `TypeOrmPaginationAdapter`

The default adapter implementation for TypeORM.

### `TypeOrmPaginationOptions`

Interface defining the options expected by `TypeOrmPaginationAdapter`, extending `BasePaginationOptions`.

### `RelayPaginatedArgs`

Standard GraphQL arguments class for Relay pagination (`first`, `last`, `before`, `after`, `orderBy`, etc.).

### GraphQL Types (`Connection`, `Edge`, `PageInfoObject`)

Helper functions/classes (exported from `nestjs-graphql-relay-pagination/gql`) to easily create the standard Relay GraphQL Connection types in your schema.

Example:

```typescript
import { ObjectType } from '@nestjs/graphql';
import { Connection } from 'nestjs-graphql-relay-pagination';
import { YourEntity } from './your-entity.entity';

@ObjectType()
export class YourEntityConnection extends Connection(YourEntity) {}
```

## Current Limitations

- Currently only provides and tests the `TypeOrmPaginationAdapter`.
- Relies on TypeORM metadata for default primary key and sort columns.

## TODO

- [ ] Refine and finalize the public API exports.
- [ ] Add comprehensive unit and integration tests for the TypeORM adapter and service.
- [ ] Improve documentation with more examples and edge cases.
- [ ] Consider adding more sophisticated filtering/sorting options directly to `TypeOrmPaginationOptions` beyond the `queryBuilderCallback`.
- [ ] Clean up internal structure (remove unused old services/factories).

## License

MIT
