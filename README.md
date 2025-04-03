# nestjs-graphql-relay-pagination

A flexible pagination module for NestJS GraphQL applications following the Relay cursor pagination specification.

## Installation

```bash
npm install nestjs-graphql-relay-pagination
```

## Features

- Cursor-based pagination following the Relay specification
- Works with NestJS and GraphQL
- Customizable cursor encoding/decoding
- Support for various filtering and sorting options
- Easy integration with existing NestJS applications
- Currently optimized for TypeORM (with plans to support more ORMs)

## Usage

### Import the module

```typescript
import { Module } from '@nestjs/common';
import { PaginationModule } from 'nestjs-graphql-relay-pagination';

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
} from 'nestjs-graphql-relay-pagination';
import { YourEntity } from './your-entity.entity';

@Resolver(() => YourEntity)
export class YourResolver {
  constructor(private readonly paginationService: PaginationService) {}

  @Query(() => YourEntity)
  async findAll(@Args() args: RelayPaginatedArgs) {
    return this.paginationService.paginate({
      args,
      query: (queryBuilder) => {
        // Your query logic here
        return queryBuilder;
      },
    });
  }
}
```

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
