# nestjs-graphql-relay-pagination

A flexible pagination module for NestJS GraphQL applications following the Relay cursor pagination specification.

**✨ Compatible with both NestJS 10 and 11!**

## Installation

```bash
npm install @hejtech/nestjs-graphql-relay-pagination
```

## Version Compatibility

| Package Version | NestJS Version       |
| --------------- | -------------------- |
| 1.x.x           | ^10.0.0 \|\| ^11.0.0 |
| 0.x.x           | ^10.0.0              |

## Features

- 🚀 **NestJS 10 & 11 Compatible** - Works with both NestJS 10 and 11
- 📄 Cursor-based pagination following the Relay specification
- 🔧 Works seamlessly with NestJS and GraphQL
- 🔐 Customizable cursor encoding/decoding
- 🎯 Support for various filtering and sorting options
- ⚡ Easy integration with existing NestJS applications
- 🗄️ Currently optimized for TypeORM (with plans to support more ORMs)
- 🧪 Comprehensive test coverage with both unit and integration tests

## Usage

### Import the module

```typescript
import { Module } from '@nestjs/common';
import { PaginationModule } from '@hejtech/nestjs-graphql-relay-pagination';

@Module({
  imports: [
    PaginationModule,
    // other modules...
  ],
})
export class AppModule {}
```

### Use in your resolvers

```typescript
import { Resolver, Query, Args } from '@nestjs/graphql';
import {
  PaginationService,
  RelayPaginatedArgs,
} from '@hejtech/nestjs-graphql-relay-pagination';
import { YourEntity } from './your-entity.entity';

@Resolver(() => YourEntity)
export class YourResolver {
  constructor(private readonly paginationService: PaginationService) {}

  @Query(() => YourEntity)
  async findAll(@Args() args: RelayPaginatedArgs) {
    return this.paginationService.getManyWithCount({
      args,
      query: (queryBuilder) => {
        // Your query logic here
        return queryBuilder;
      },
    });
  }
}
```

### Sorting and Filtering

This library intentionally delegates all sorting and filtering logic to your `QueryBuilder`. This approach provides maximum flexibility, allowing you to implement complex, multi-column sorting, utilize database-specific functions, and handle filtering dynamically.

You are responsible for adding any `orderBy` clauses to your `QueryBuilder` instance before passing it to the `setup` method. The pagination service will automatically introspect the `QueryBuilder` to determine the sort order for cursor creation.

If no `orderBy` clause is present on the `QueryBuilder`, the service will automatically sort by the entity's creation date (`createdAt` or the field decorated with `@CreateDateColumn`) in descending order as a sensible default.

#### Example

Here is an example of a resolver that handles dynamic sorting and filtering before pagination.

```typescript
import { Resolver, Query, Args } from '@nestjs/graphql';
import {
  PaginationService,
  RelayPaginatedArgs,
} from '@hejtech/nestjs-graphql-relay-pagination';
import { YourEntity } from './your-entity.entity';
import { YourEntitySortField, SortOrder } from '../enums'; // Your application-specific enums
import { Repository } from 'typeorm';

@ArgsType()
class FindAllArgs extends RelayPaginatedArgs {
  @Field(() => String, { nullable: true })
  nameContains?: string;

  @Field(() => YourEntitySortField, { nullable: true })
  sortBy?: YourEntitySortField;

  @Field(() => SortOrder, { nullable: true })
  sortOrder?: SortOrder;
}

@Resolver(() => YourEntity)
export class YourResolver {
  constructor(
    private readonly paginationService: PaginationService<YourEntity>,
    private readonly entityRepository: Repository<YourEntity>, // Injected repository
  ) {}

  @Query(() => YourEntity)
  async findAll(@Args() args: FindAllArgs) {
    const { sortBy, sortOrder, nameContains, ...paginationArgs } = args;

    const queryBuilder = this.entityRepository.createQueryBuilder('entity');

    if (nameContains) {
      queryBuilder.andWhere('entity.name ILIKE :nameContains', {
        nameContains: `%${nameContains}%`,
      });
    }

    if (sortBy && sortOrder) {
      const sortColumn = this.getSortColumn(sortBy);
      queryBuilder.orderBy(sortColumn, sortOrder, 'NULLS LAST');
    }

    // The pagination service automatically uses the order set on the queryBuilder
    this.paginationService.setup(this.entityRepository, {
      ...paginationArgs,
      queryBuilder,
    });

    return this.paginationService.getManyWithCount();
  }

  private getSortColumn(sortBy: YourEntitySortField): string {
    const sortFieldMap: { [key in YourEntitySortField]: string } = {
      [YourEntitySortField.CREATED_AT]: 'entity.createdAt',
      [YourEntitySortField.NAME]: 'entity.name',
    };
    return sortFieldMap[sortBy];
  }
}
```

## Development

### Running the tests

This package includes both unit tests and integration tests. The integration tests require a running instance of CockroachDB, which is provided via Docker Compose.

To run the unit tests:

```bash
pnpm test
```

To run the integration tests:

1. Start the required services:

```bash
pnpm run docker:up
```

2. Run the integration tests:

```bash
pnpm run test:int
```

3. When done, shut down the services:

```bash
pnpm run docker:down
```

## API Documentation

### PaginationService

The main service for handling pagination operations.

### RelayPaginatedArgs

GraphQL arguments for Relay-style pagination, including `first`, `last`, `before`, and `after`.

### PaginationFactory

Factory for creating pagination instances with custom configurations.

## Current Limitations

This library is currently tightly coupled with TypeORM. We're working on making it more ORM-agnostic.

## TODO

- [ ] Create a more generic core pagination system
- [ ] Decouple from TypeORM
- [ ] Add more ORM adapters:
  - [ ] MikroORM
  - [ ] Sequelize
  - [ ] Prisma
- [ ] Provide documentation for creating custom adapters
- [ ] Add more comprehensive examples
- [ ] Improve test coverage

## License

MIT
