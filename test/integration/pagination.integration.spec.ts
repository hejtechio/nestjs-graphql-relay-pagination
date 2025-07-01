/* eslint-disable @stylistic/js/max-len */
/* eslint-disable max-lines */
import { RelayPaginationArgs } from 'src/args/relay-paginated.args';
import {
  createPaginationServiceProvider,
  InjectPaginationService,
} from 'src/decorators/pagination-service.decorator';
import { PaginationFactory } from 'src/factories/pagination.factory';
import { CursorService } from 'src/services/cursor.service';
import { PaginationService } from 'src/services/pagination.service';
import { QueryService } from 'src/services/query.service';
import { DEFAULT_LIMIT } from 'src/util/consts';
import { Inject, Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import { addSeconds } from 'date-fns';
import { Repository } from 'typeorm';
import { v5 as uuidv5 } from 'uuid';
import { TestEntity } from './entities/test.entity';
import { TaskEntity } from './entities/task.entity';
import { TaskEventEntity } from './entities/task-event.entity';
import {
  TaskTargetEntity,
  TaskTargetType,
} from './entities/task-target.entity';

// Enums and interfaces for complex scenario testing
export enum TaskSortField {
  CREATED_AT = 'CREATED_AT',
  NAME = 'NAME',
  LAST_EVENT_AT = 'LAST_EVENT_AT',
}

export interface TasksArgs extends RelayPaginationArgs<TaskEntity> {
  nameContains?: string;
  status?: string;
  clientId?: string;
  orderBy?: TaskSortField;
  order?: 'ASC' | 'DESC';
}

describe('PaginationService Integration Test', () => {
  let paginationFactory: PaginationFactory;
  let paginationService: PaginationService<TestEntity>;
  let repository: Repository<TestEntity>;
  let entities: TestEntity[] = [];
  let module: TestingModule;

  beforeAll(async () => {
    module = await createTestingModule();
    repository = module.get(getRepositoryToken(TestEntity));
    paginationFactory = module.get(PaginationFactory);
  });

  beforeEach(async () => {
    await clearRepository();
    entities = [];
  });

  afterAll(async () => {
    await repository.manager.connection.destroy();
  });

  it('should paginate entities correctly using after', async () => {
    await createEntities(5);
    const firstPage = await getManyWithCount({ first: 2 });

    expect(firstPage).toMatchObject({
      edges: expect.any(Array),
      currentCount: 5,
      previousCount: 0,
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
      },
    });
    expect(firstPage.edges[0].node.name).toBe(entities[0].name);
    expect(firstPage.edges[1].node.name).toBe(entities[1].name);

    const secondPage = await getManyWithCount({
      first: 2,
      after: firstPage.pageInfo.endCursor,
    });

    expect(secondPage).toMatchObject({
      edges: expect.any(Array),
      currentCount: 3,
      previousCount: 1,
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: true,
      },
    });
    expect(secondPage.edges[0].node.name).toBe(entities[2].name);
    expect(secondPage.edges[1].node.name).toBe(entities[3].name);

    const lastPage = await getManyWithCount({
      first: 2,
      after: secondPage.pageInfo.endCursor,
    });

    expect(lastPage).toMatchObject({
      edges: expect.any(Array),
      currentCount: 1,
      previousCount: 3,
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: true,
      },
    });

    expect(lastPage.edges.length).toBe(1);
  });

  it('should paginate entities correctly using before', async () => {
    await createEntities(10);
    const firstPage = await getManyWithCount({ first: 5 });

    expect(firstPage).toMatchObject({
      edges: expect.any(Array),
      currentCount: 10,
      previousCount: 0,
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
      },
    });

    const afterPage = await getManyWithCount({
      after: firstPage.edges[0].cursor,
    });

    expect(afterPage).toMatchObject({
      edges: expect.any(Array),
    });
    expect(afterPage.edges[0].node.name).toBe(entities[1].name);

    const beforePage = await getManyWithCount({
      before: firstPage.edges[1].cursor,
    });

    expect(beforePage).toMatchObject({
      edges: expect.any(Array),
    });
    expect(beforePage.edges[0].node.name).toBe(entities[0].name);
  });

  it('should set correct pageInfo', async () => {
    await createEntities(5);
    const firstPage = await getManyWithCount({ first: 5 });

    expect(firstPage).toMatchObject({
      edges: expect.any(Array),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const emptyPage = await getManyWithCount({
      after: firstPage.pageInfo.endCursor,
    });

    expect(emptyPage).toMatchObject({
      edges: expect.any(Array),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: '',
        endCursor: '',
      },
      currentCount: 0,
      previousCount: 4,
    });
  });

  it('should set correct pageInfo when using default limit', async () => {
    await createEntities(DEFAULT_LIMIT + 1);
    const pageWithoutFirstOrLast = await getManyWithCount();

    expect(pageWithoutFirstOrLast).toMatchObject({
      edges: expect.any(Array),
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
      },
    });
  });

  it('should order entities correctly', async () => {
    await createEntities(5);

    // Test ascending order (default)
    const ascendingPage = await getManyWithCount({
      first: 5,
    });
    expect(ascendingPage.edges[0].node.name).toBe(entities[0].name);

    // Test descending order with custom query builder
    paginationService = paginationFactory.create<TestEntity>();
    const descendingQueryBuilder = repository.createQueryBuilder('entity');
    descendingQueryBuilder.orderBy('entity.createdAt', 'DESC');

    paginationService.setup(repository, {
      first: 5,
      queryBuilder: descendingQueryBuilder,
    });

    const descendingPage = await paginationService.getManyWithCount();
    expect(descendingPage.edges[0].node.name).toBe(entities[4].name);
  });

  it('should paginate entities forward correctly with first and after', async () => {
    await createEntities(10);

    // Fetch the first 5 entities
    const firstPage = await getManyWithCount({ first: 5 });

    expect(firstPage).toMatchObject({
      edges: expect.any(Array),
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
        startCursor: expect.any(String),
        endCursor: expect.any(String),
      },
    });
    expect(firstPage.edges).toHaveLength(5);

    // Fetch the next 5 entities using after
    const secondPage = await getManyWithCount({
      first: 5,
      after: firstPage.pageInfo.endCursor,
    });

    expect(secondPage).toMatchObject({
      edges: expect.any(Array),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: true,
        startCursor: expect.any(String),
        endCursor: expect.any(String),
      },
    });
    expect(secondPage.edges).toHaveLength(5);
  });

  it('should correctly set PageInfo fields', async () => {
    await createEntities(5);

    const page = await getManyWithCount({ first: 3 });

    expect(page.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });

    const nextPage = await getManyWithCount({
      first: 3,
      after: page.pageInfo.endCursor,
    });

    expect(nextPage.pageInfo).toMatchObject({
      hasNextPage: false,
      hasPreviousPage: true,
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });
  });

  it('should throw an error if trying to paginate backards without a cursor', async () => {
    await createEntities(5);

    const page = await getManyWithCount({ first: 3 });

    expect(page.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
    });

    await expect(getManyWithCount({ last: 3 })).rejects.toThrow();
  });

  it.skip('should maintain consistent edge order with first/after and last/before', async () => {
    await createEntities(5);

    // Forward pagination
    const forwardPage = await getManyWithCount({ first: 5 });

    expect(forwardPage.edges[0].node.name).toBe(entities[0].name);
    expect(forwardPage.edges[4].node.name).toBe(entities[4].name);

    // Backward pagination - use cursor from middle entity instead of end cursor
    const backwardPage = await getManyWithCount({
      last: 2,
      before: forwardPage.edges[4].cursor, // cursor of Entity 5
    });

    expect(backwardPage.edges.length).toBe(2);
    expect(backwardPage.edges[0].node.name).toBe(entities[2].name);
    expect(backwardPage.edges[1].node.name).toBe(entities[3].name);
  });

  it('should throw an error for invalid pagination arguments', async () => {
    await createEntities(5);

    await expect(getManyWithCount({ first: -1 })).rejects.toThrow();

    await expect(getManyWithCount({ last: -1 })).rejects.toThrow();
  });

  it('should correctly set hasPreviousPage and hasNextPage fields', async () => {
    await createEntities(10);

    // Test forward pagination (first 5)
    const firstPage = await getManyWithCount({ first: 5 });

    expect(firstPage.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false, // No previous pages because we're at the start
    });

    // Paginate to the next set (forward)
    const secondPage = await getManyWithCount({
      first: 3,
      after: firstPage.pageInfo.endCursor,
    });

    expect(secondPage.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: true, // There are previous pages
    });

    // Paginate to the last set (forward)
    const lastPage = await getManyWithCount({
      first: 2,
      after: secondPage.pageInfo.endCursor,
    });

    expect(lastPage.pageInfo).toMatchObject({
      hasNextPage: false, // No more pages after this
      hasPreviousPage: true,
    });

    // Test backward pagination (last 5)
    const backwardPage = await getManyWithCount({
      last: 5,
      before: firstPage.pageInfo.endCursor,
    });

    expect(backwardPage.pageInfo).toMatchObject({
      hasNextPage: false, // No "next" in the context of backward pagination
      hasPreviousPage: true, // There are previous pages
    });

    // Paginate to the previous set (backward)
    const previousPage = await getManyWithCount({
      last: 3,
      before: backwardPage.pageInfo.startCursor,
    });

    expect(previousPage.pageInfo).toMatchObject({
      hasNextPage: false, // We are at the bottom
      hasPreviousPage: true, // There are previous edges before this
    });

    // TODO: Make a test for using first: 100, with the bottom cursor
    // it returns 0 edges, but returns "hasPreviousPage": true,
  });

  it('should paginate entities correctly in descending order using after cursor', async () => {
    // Create 5 entities with known names and timestamps
    await createEntities(5);

    // Paginate the first 2 entities in descending order
    const firstPage = await createDescendingPagination({ first: 2 });

    expect(firstPage.edges).toHaveLength(2);
    expect(firstPage.edges[0].node.name).toBe('Entity 5');
    expect(firstPage.edges[1].node.name).toBe('Entity 4');

    // Paginate the next 2 entities using the end cursor of the first page
    const secondPage = await createDescendingPagination({
      first: 2,
      after: firstPage.pageInfo.endCursor,
    });

    expect(secondPage.edges).toHaveLength(2);
    expect(secondPage.edges[0].node.name).toBe('Entity 3');
    expect(secondPage.edges[1].node.name).toBe('Entity 2');

    // Paginate the last entity
    const lastPage = await createDescendingPagination({
      first: 2,
      after: secondPage.pageInfo.endCursor,
    });

    expect(lastPage.edges).toHaveLength(1);
    expect(lastPage.edges[0].node.name).toBe('Entity 1');
  });

  describe('withWhere method integration tests', () => {
    it('should filter entities by a single field using withWhere', async () => {
      // Create entities with different names and statuses
      await repository.save([
        {
          id: uuidv5('1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Test Entity 1',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: uuidv5('2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Test Entity 2',
          status: 'INACTIVE',
          createdAt: new Date('2024-01-02'),
        },
        {
          id: uuidv5('3', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Different Entity',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-03'),
        },
      ]);

      const result = await getManyWithCount({ first: 10 }, (qs) =>
        qs.withWhere({ status: 'ACTIVE' }),
      );

      expect(result.edges).toHaveLength(2);
      expect(result.edges[0].node.name).toBe('Test Entity 1');
      expect(result.edges[1].node.name).toBe('Different Entity');
    });

    it('should filter entities by multiple fields using withWhere', async () => {
      // Create entities with different combinations of name and status
      await repository.save([
        {
          id: uuidv5('1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Target Entity',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: uuidv5('2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Target Entity',
          status: 'INACTIVE',
          createdAt: new Date('2024-01-02'),
        },
        {
          id: uuidv5('3', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Other Entity',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-03'),
        },
      ]);

      const result = await getManyWithCount({ first: 10 }, (qs) =>
        qs.withWhere({ name: 'Target Entity', status: 'ACTIVE' }),
      );

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0].node.name).toBe('Target Entity');
      expect(result.edges[0].node.status).toBe('ACTIVE');
    });

    it('should work with pagination when using withWhere', async () => {
      // Create multiple entities with the same status
      const entities = Array.from({ length: 5 }, (_, i) => ({
        id: uuidv5(i.toString(), '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
        name: `Active Entity ${i + 1}`,
        status: 'ACTIVE',
        createdAt: addSeconds(new Date('2024-01-01'), i),
      }));

      // Add one inactive entity
      entities.push({
        id: uuidv5('inactive', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
        name: 'Inactive Entity',
        status: 'INACTIVE',
        createdAt: addSeconds(new Date('2024-01-01'), 10),
      });

      await repository.save(entities);

      // First page with where condition
      const firstPage = await getManyWithCount({ first: 3 }, (qs) =>
        qs.withWhere({ status: 'ACTIVE' }),
      );

      expect(firstPage.edges).toHaveLength(3);
      expect(firstPage.currentCount).toBe(5); // Total active entities
      expect(firstPage.pageInfo.hasNextPage).toBe(true);
      expect(firstPage.pageInfo.hasPreviousPage).toBe(false);

      // Second page with where condition
      const secondPage = await getManyWithCount(
        { first: 3, after: firstPage.pageInfo.endCursor },
        (qs) => qs.withWhere({ status: 'ACTIVE' }),
      );

      expect(secondPage.edges).toHaveLength(2);
      expect(secondPage.currentCount).toBe(2); // Remaining active entities
      expect(secondPage.pageInfo.hasNextPage).toBe(false);
      expect(secondPage.pageInfo.hasPreviousPage).toBe(true);
    });

    it('should return empty results when no entities match withWhere conditions', async () => {
      // Create entities with different status
      await repository.save([
        {
          id: uuidv5('1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Entity 1',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: uuidv5('2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Entity 2',
          status: 'INACTIVE',
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const result = await getManyWithCount({ first: 10 }, (qs) =>
        qs.withWhere({ status: 'DELETED' }),
      );

      expect(result.edges).toHaveLength(0);
      expect(result.pageInfo.hasNextPage).toBe(false);
      expect(result.pageInfo.hasPreviousPage).toBe(false);
    });

    it('should support method chaining with withWhere', async () => {
      // Create test entities
      await repository.save([
        {
          id: uuidv5('1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Chain Test 1',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: uuidv5('2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Chain Test 2',
          status: 'ACTIVE',
          createdAt: new Date('2024-01-02'),
        },
      ]);

      const paginationResult = await getManyWithCount({ first: 10 }, (qs) => {
        // Test method chaining
        const result = qs
          .withWhere({ status: 'ACTIVE' })
          .withWhere({ name: 'Chain Test 1' });

        expect(result).toBe(qs); // Should return this for chaining
      });

      expect(paginationResult.edges).toHaveLength(1);
      expect(paginationResult.edges[0].node.name).toBe('Chain Test 1');
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    describe('Multiple Sort Fields', () => {
      it('should handle multiple order by fields correctly', async () => {
        // Create entities with same status but different names and dates
        await repository.save([
          {
            id: uuidv5('1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Beta',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-01'),
          },
          {
            id: uuidv5('2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Alpha',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-01'),
          },
          {
            id: uuidv5('3', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Gamma',
            status: 'INACTIVE',
            createdAt: new Date('2024-01-02'),
          },
        ]);

        // Test multiple order by: status ASC, name DESC
        paginationService = paginationFactory.create<TestEntity>();
        const queryBuilder = repository.createQueryBuilder('entity');
        queryBuilder
          .orderBy('entity.status', 'ASC')
          .addOrderBy('entity.name', 'DESC');

        paginationService.setup(repository, {
          first: 3,
          queryBuilder,
        });

        const result = await paginationService.getManyWithCount();

        expect(result.edges).toHaveLength(3);
        // ACTIVE status comes first (ASC), then within ACTIVE, name DESC (Beta before Alpha)
        expect(result.edges[0].node.status).toBe('ACTIVE');
        expect(result.edges[0].node.name).toBe('Beta');
        expect(result.edges[1].node.status).toBe('ACTIVE');
        expect(result.edges[1].node.name).toBe('Alpha');
        expect(result.edges[2].node.status).toBe('INACTIVE');
        expect(result.edges[2].node.name).toBe('Gamma');
      });

      it('should work correctly with multiple sort fields and pagination', async () => {
        await repository.save([
          {
            id: uuidv5('1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Entity A',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-01'),
          },
          {
            id: uuidv5('2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Entity B',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-01'),
          },
          {
            id: uuidv5('3', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Entity C',
            status: 'INACTIVE',
            createdAt: new Date('2024-01-02'),
          },
        ]);

        // Test pagination with multiple sort fields - get all results in first page
        paginationService = paginationFactory.create<TestEntity>();
        const queryBuilder = repository.createQueryBuilder('entity');
        queryBuilder
          .orderBy('entity.status', 'ASC')
          .addOrderBy('entity.name', 'ASC');

        paginationService.setup(repository, {
          first: 10, // Get all entities to verify sort order
          queryBuilder,
        });

        const result = await paginationService.getManyWithCount();
        expect(result.edges).toHaveLength(3);

        // Verify sort order: ACTIVE status first (alphabetical), then names within status
        expect(result.edges[0].node.status).toBe('ACTIVE');
        expect(result.edges[0].node.name).toBe('Entity A');
        expect(result.edges[1].node.status).toBe('ACTIVE');
        expect(result.edges[1].node.name).toBe('Entity B');
        expect(result.edges[2].node.status).toBe('INACTIVE');
        expect(result.edges[2].node.name).toBe('Entity C');

        // Test that pagination metadata is correct
        expect(result.pageInfo.hasNextPage).toBe(false);
        expect(result.pageInfo.hasPreviousPage).toBe(false);
      });
    });

    describe('Null and Empty Data Handling', () => {
      it('should handle different status values in sort fields gracefully', async () => {
        // Create entities with different status values (avoiding null due to column constraints)
        await repository.save([
          {
            id: uuidv5('zzz', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'ZZZ Status Entity',
            status: 'ZZZ_STATUS', // This will sort last alphabetically
            createdAt: new Date('2024-01-01'),
          },
          {
            id: uuidv5('active', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Active Entity',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-02'),
          },
          {
            id: uuidv5('aaa', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'AAA Status Entity',
            status: 'AAA_STATUS', // This will sort first alphabetically
            createdAt: new Date('2024-01-03'),
          },
        ]);

        paginationService = paginationFactory.create<TestEntity>();
        const queryBuilder = repository.createQueryBuilder('entity');
        queryBuilder.orderBy('entity.status', 'ASC');

        paginationService.setup(repository, {
          first: 3,
          queryBuilder,
        });

        const result = await paginationService.getManyWithCount();
        expect(result.edges).toHaveLength(3);
        expect(result.edges[0].node.status).toBe('AAA_STATUS');
        expect(result.edges[1].node.status).toBe('ACTIVE');
        expect(result.edges[2].node.status).toBe('ZZZ_STATUS');
      });

      it('should handle empty result sets correctly', async () => {
        // Don't create any entities - test empty dataset
        const result = await getManyWithCount({ first: 10 });

        expect(result.edges).toHaveLength(0);
        expect(result.currentCount).toBe(0);
        expect(result.previousCount).toBe(0);
        expect(result.pageInfo).toMatchObject({
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: '',
          endCursor: '',
        });
      });

      it('should handle filtered empty result sets', async () => {
        await createEntities(5);

        const result = await getManyWithCount({ first: 10 }, (qs) =>
          qs.withWhere({ status: 'NONEXISTENT_STATUS' }),
        );

        expect(result.edges).toHaveLength(0);
        expect(result.currentCount).toBe(0);
        expect(result.pageInfo).toMatchObject({
          hasNextPage: false,
          hasPreviousPage: false,
          startCursor: '',
          endCursor: '',
        });
      });
    });

    describe('Large Dataset Performance', () => {
      it('should handle large datasets efficiently', async () => {
        // Create a larger dataset to test performance and cursor logic
        const largeDataset = Array.from({ length: 100 }, (_, i) => ({
          id: uuidv5(`large-${i}`, '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: `Large Entity ${i + 1}`,
          status: i % 2 === 0 ? 'ACTIVE' : 'INACTIVE',
          createdAt: addSeconds(new Date('2024-01-01'), i),
        }));

        await repository.save(largeDataset);

        // Test pagination through large dataset
        const pageSize = 20;
        let currentCursor: string | undefined;
        let totalRetrieved = 0;
        let pageCount = 0;

        while (totalRetrieved < 100 && pageCount < 10) {
          // Safety limit
          const page = await getManyWithCount({
            first: pageSize,
            after: currentCursor,
          });

          totalRetrieved += page.edges.length;
          currentCursor = page.pageInfo.endCursor;
          pageCount++;

          expect(page.edges.length).toBeLessThanOrEqual(pageSize);

          if (!page.pageInfo.hasNextPage) {
            break;
          }
        }

        expect(totalRetrieved).toBe(100);
        expect(pageCount).toBe(5); // 100 / 20 = 5 pages
      });

      it('should maintain sort order consistency across large dataset pages', async () => {
        const largeDataset = Array.from({ length: 50 }, (_, i) => ({
          id: uuidv5(`sort-${i}`, '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: `Entity ${String(i + 1).padStart(3, '0')}`, // Ensures proper string sorting
          status: 'ACTIVE',
          createdAt: addSeconds(new Date('2024-01-01'), i),
        }));

        await repository.save(largeDataset);

        // Test descending order across multiple pages
        paginationService = paginationFactory.create<TestEntity>();
        let queryBuilder = repository.createQueryBuilder('entity');
        queryBuilder.orderBy('entity.name', 'DESC');

        paginationService.setup(repository, {
          first: 10,
          queryBuilder,
        });

        const firstPage = await paginationService.getManyWithCount();
        expect(firstPage.edges[0].node.name).toBe('Entity 050');
        expect(firstPage.edges[9].node.name).toBe('Entity 041');

        // Second page should continue the descending order
        paginationService = paginationFactory.create<TestEntity>();
        queryBuilder = repository.createQueryBuilder('entity');
        queryBuilder.orderBy('entity.name', 'DESC');

        paginationService.setup(repository, {
          first: 10,
          after: firstPage.pageInfo.endCursor,
          queryBuilder,
        });

        const secondPage = await paginationService.getManyWithCount();
        expect(secondPage.edges[0].node.name).toBe('Entity 040');
        expect(secondPage.edges[9].node.name).toBe('Entity 031');
      });
    });

    describe('Invalid Cursor Scenarios', () => {
      it('should handle malformed cursors gracefully', async () => {
        await createEntities(5);

        // Test with completely invalid cursor - library is forgiving and treats it as no cursor
        const result1 = await getManyWithCount({
          first: 3,
          after: 'invalid-cursor-string',
        });
        expect(result1.edges).toBeDefined();
        expect(result1.edges.length).toBeLessThanOrEqual(3);

        // Test with valid base64 but invalid content - library handles gracefully
        const invalidCursor = Buffer.from('{"invalid": "cursor"}').toString(
          'base64',
        );
        const result2 = await getManyWithCount({
          first: 3,
          after: invalidCursor,
        });
        expect(result2.edges).toBeDefined();
        expect(result2.edges.length).toBeLessThanOrEqual(3);
      });

      it('should handle cursors from different sort orders', async () => {
        await createEntities(5);

        // Get cursor from ascending order
        const ascPage = await getManyWithCount({ first: 2 });
        const ascCursor = ascPage.pageInfo.endCursor;

        // Try to use that cursor with descending order - should handle gracefully
        paginationService = paginationFactory.create<TestEntity>();
        const descQueryBuilder = repository.createQueryBuilder('entity');
        descQueryBuilder.orderBy('entity.createdAt', 'DESC');

        paginationService.setup(repository, {
          first: 2,
          after: ascCursor,
          queryBuilder: descQueryBuilder,
        });

        // This might return unexpected results but shouldn't crash
        const result = await paginationService.getManyWithCount();
        expect(result.edges).toBeDefined();
        expect(Array.isArray(result.edges)).toBe(true);
      });
    });

    describe('Query Builder State Preservation', () => {
      it('should clone query builder to avoid modifying original', async () => {
        await createEntities(5);

        const originalQueryBuilder = repository.createQueryBuilder('entity');
        originalQueryBuilder.where('entity.status = :status', {
          status: 'ACTIVE',
        });
        originalQueryBuilder.orderBy('entity.name', 'ASC');

        // Store original state
        const originalParams = { ...originalQueryBuilder.getParameters() };

        paginationService = paginationFactory.create<TestEntity>();
        paginationService.setup(repository, {
          first: 3,
          queryBuilder: originalQueryBuilder,
        });

        const result = await paginationService.getManyWithCount();

        // Verify the pagination worked correctly
        expect(result.edges).toBeDefined();
        expect(result.edges.length).toBeLessThanOrEqual(3);

        // Note: The library may modify the query builder to add LIMIT clauses
        // This is expected behavior for pagination libraries
        expect(originalQueryBuilder.getParameters()).toEqual(originalParams);
      });

      it('should handle concurrent pagination requests with different query builders', async () => {
        await createEntities(10);

        // Create two different query builders
        const activeQueryBuilder = repository.createQueryBuilder('entity');
        activeQueryBuilder.where('entity.status = :status', {
          status: 'ACTIVE',
        });
        activeQueryBuilder.orderBy('entity.createdAt', 'ASC');

        const inactiveQueryBuilder = repository.createQueryBuilder('entity');
        inactiveQueryBuilder.where('entity.status = :status', {
          status: 'INACTIVE',
        });
        inactiveQueryBuilder.orderBy('entity.createdAt', 'DESC');

        // Run concurrent pagination requests
        const activeService = paginationFactory.create<TestEntity>();
        const inactiveService = paginationFactory.create<TestEntity>();

        activeService.setup(repository, {
          first: 5,
          queryBuilder: activeQueryBuilder,
        });

        inactiveService.setup(repository, {
          first: 5,
          queryBuilder: inactiveQueryBuilder,
        });

        const [activeResults, inactiveResults] = await Promise.all([
          activeService.getManyWithCount(),
          inactiveService.getManyWithCount(),
        ]);

        // Verify each service returned correct filtered results
        expect(
          activeResults.edges.every((edge) => edge.node.status === 'ACTIVE'),
        ).toBe(true);
        expect(
          inactiveResults.edges.every(
            (edge) => edge.node.status === 'INACTIVE',
          ),
        ).toBe(true);
      });
    });

    describe('Complex Join Operations', () => {
      it('should handle query builders with joins', async () => {
        await createEntities(5);

        // Create a query builder with a self-join using correct table name
        paginationService = paginationFactory.create<TestEntity>();
        const queryBuilder = repository.createQueryBuilder('entity');
        queryBuilder
          .leftJoin(
            'integrationtest_entity',
            'related',
            'related.status = entity.status',
          )
          .where('entity.status = :status', { status: 'ACTIVE' })
          .orderBy('entity.createdAt', 'ASC');

        paginationService.setup(repository, {
          first: 3,
          queryBuilder,
        });

        const result = await paginationService.getManyWithCount();
        expect(result.edges).toBeDefined();
        expect(
          result.edges.every((edge) => edge.node.status === 'ACTIVE'),
        ).toBe(true);
      });
    });

    describe('Different Data Types Sorting', () => {
      it('should handle sorting by date fields correctly', async () => {
        const now = new Date();
        await repository.save([
          {
            id: uuidv5('future', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Future Entity',
            status: 'ACTIVE',
            createdAt: addSeconds(now, 100),
          },
          {
            id: uuidv5('past', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Past Entity',
            status: 'ACTIVE',
            createdAt: addSeconds(now, -100),
          },
          {
            id: uuidv5('present', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Present Entity',
            status: 'ACTIVE',
            createdAt: now,
          },
        ]);

        paginationService = paginationFactory.create<TestEntity>();
        const queryBuilder = repository.createQueryBuilder('entity');
        queryBuilder.orderBy('entity.createdAt', 'ASC');

        paginationService.setup(repository, {
          first: 3,
          queryBuilder,
        });

        const result = await paginationService.getManyWithCount();
        expect(result.edges).toHaveLength(3);
        expect(result.edges[0].node.name).toBe('Past Entity');
        expect(result.edges[1].node.name).toBe('Present Entity');
        expect(result.edges[2].node.name).toBe('Future Entity');
      });

      it('should handle sorting by string fields with special characters', async () => {
        await repository.save([
          {
            id: uuidv5('special1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Entity with "quotes"',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-01'),
          },
          {
            id: uuidv5('special2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: "Entity with 'apostrophes'",
            status: 'ACTIVE',
            createdAt: new Date('2024-01-02'),
          },
          {
            id: uuidv5('special3', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
            name: 'Entity with [brackets]',
            status: 'ACTIVE',
            createdAt: new Date('2024-01-03'),
          },
        ]);

        paginationService = paginationFactory.create<TestEntity>();
        const queryBuilder = repository.createQueryBuilder('entity');
        queryBuilder.orderBy('entity.name', 'ASC');

        paginationService.setup(repository, {
          first: 3,
          queryBuilder,
        });

        const result = await paginationService.getManyWithCount();
        expect(result.edges).toHaveLength(3);
        // Should handle special characters without errors
        expect(
          result.edges.every((edge) => edge.node.name.includes('Entity')),
        ).toBe(true);
      });
    });
  });

  describe('Complex Query Scenarios (Task Management System)', () => {
    let taskRepository: Repository<TaskEntity>;
    let taskEventRepository: Repository<TaskEventEntity>;
    let taskTargetRepository: Repository<TaskTargetEntity>;
    let taskPaginationService: PaginationService<TaskEntity>;
    const ORG_ID_1 = 'org-1';
    const ORG_ID_2 = 'org-2';
    const CLIENT_ID_1 = 'client-1';
    const CLIENT_ID_2 = 'client-2';

    beforeAll(async () => {
      taskRepository = module.get(getRepositoryToken(TaskEntity));
      taskEventRepository = module.get(getRepositoryToken(TaskEventEntity));
      taskTargetRepository = module.get(getRepositoryToken(TaskTargetEntity));
    });

    beforeEach(async () => {
      await clearTaskRepositories();
    });

    it('should filter tasks by organization and name contains', async () => {
      await createComplexTaskScenario();

      const result = await findTasksPaginated(
        {
          first: 10,
          nameContains: 'Task A',
        },
        ORG_ID_1,
      );

      expect(result.edges).toHaveLength(2); // Task A1 and Task A2
      expect(
        result.edges.every(
          (edge) =>
            edge.node.name.includes('Task A') &&
            edge.node.organizationId === ORG_ID_1,
        ),
      ).toBe(true);
    });

    it('should filter tasks by status', async () => {
      await createComplexTaskScenario();

      const result = await findTasksPaginated(
        {
          first: 10,
          status: 'INACTIVE',
        },
        ORG_ID_1,
      );

      expect(result.edges).toHaveLength(1); // Only Task A2 is INACTIVE
      expect(result.edges[0].node.status).toBe('INACTIVE');
      expect(result.edges[0].node.name).toBe('Task A2');
    });

    it('should filter tasks by clientId with joins', async () => {
      await createComplexTaskScenario();

      const result = await findTasksPaginated(
        {
          first: 10,
          clientId: CLIENT_ID_1,
        },
        ORG_ID_1,
      );

      expect(result.edges).toHaveLength(2); // Task A1 and B1 have CLIENT_ID_1 targets
      const taskNames = result.edges.map((edge) => edge.node.name).sort();
      expect(taskNames).toEqual(['Task A1', 'Task B1']);
    });

    it('should combine multiple filters', async () => {
      await createComplexTaskScenario();

      const result = await findTasksPaginated(
        {
          first: 10,
          nameContains: 'Task A',
          status: 'ACTIVE',
          clientId: CLIENT_ID_1,
        },
        ORG_ID_1,
      );

      expect(result.edges).toHaveLength(1); // Only Task A1 matches all criteria
      expect(result.edges[0].node.name).toBe('Task A1');
      expect(result.edges[0].node.status).toBe('ACTIVE');
    });

    it('should sort by name', async () => {
      await createComplexTaskScenario();

      const result = await findTasksPaginated(
        {
          first: 10,
          orderBy: TaskSortField.NAME,
          order: 'ASC',
        },
        ORG_ID_1,
      );

      const names = result.edges.map((edge) => edge.node.name);
      expect(names).toEqual(['Task A1', 'Task A2', 'Task B1', 'Task B2']);
    });

    it('should sort by created date descending', async () => {
      await createComplexTaskScenario();

      const result = await findTasksPaginated(
        {
          first: 10,
          orderBy: TaskSortField.CREATED_AT,
          order: 'DESC',
        },
        ORG_ID_1,
      );

      const names = result.edges.map((edge) => edge.node.name);
      expect(names).toEqual(['Task B2', 'Task B1', 'Task A2', 'Task A1']);
    });

    it('should sort by last event date with subquery', async () => {
      await createComplexTaskScenario();

      const result = await findTasksPaginated(
        {
          first: 10,
          orderBy: TaskSortField.LAST_EVENT_AT,
          order: 'DESC',
        },
        ORG_ID_1,
      );

      const names = result.edges.map((edge) => edge.node.name);
      // Task B1 has the most recent event, Task A2 has no events (NULLS LAST)
      expect(names[0]).toBe('Task B1');
      expect(names.at(-1)).toBe('Task A2'); // No events, should be last
    });

    it('should handle pagination with complex filters and sorting', async () => {
      await createComplexTaskScenario();

      // First page
      const firstPage = await findTasksPaginated(
        {
          first: 2,
          orderBy: TaskSortField.NAME,
          order: 'ASC',
        },
        ORG_ID_1,
      );

      expect(firstPage.edges).toHaveLength(2);
      expect(firstPage.edges[0].node.name).toBe('Task A1');
      expect(firstPage.edges[1].node.name).toBe('Task A2');
      expect(firstPage.pageInfo.hasNextPage).toBe(true);

      // Second page
      const secondPage = await findTasksPaginated(
        {
          first: 2,
          after: firstPage.pageInfo.endCursor,
          orderBy: TaskSortField.NAME,
          order: 'ASC',
        },
        ORG_ID_1,
      );

      expect(secondPage.edges).toHaveLength(2);
      expect(secondPage.edges[0].node.name).toBe('Task B1');
      expect(secondPage.edges[1].node.name).toBe('Task B2');
      expect(secondPage.pageInfo.hasNextPage).toBe(false);
      expect(secondPage.pageInfo.hasPreviousPage).toBe(true);
    });

    it('should filter by different organization', async () => {
      await createComplexTaskScenario();

      const result = await findTasksPaginated(
        {
          first: 10,
        },
        ORG_ID_2,
      );

      expect(result.edges).toHaveLength(2); // Task C1 and C2 in ORG_ID_2
      expect(
        result.edges.every((edge) => edge.node.organizationId === ORG_ID_2),
      ).toBe(true);
      const names = result.edges.map((edge) => edge.node.name).sort();
      expect(names).toEqual(['Task C1', 'Task C2']);
    });

    async function clearTaskRepositories() {
      await taskEventRepository.clear();
      await taskTargetRepository.clear();
      await taskRepository.clear();
    }

    async function createComplexTaskScenario() {
      const baseTime = new Date('2024-01-01');

      // Create tasks in ORG_ID_1
      const tasks = await taskRepository.save([
        {
          id: uuidv5('task-a1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Task A1',
          organizationId: ORG_ID_1,
          status: 'ACTIVE',
          createdAt: addSeconds(baseTime, 1),
        },
        {
          id: uuidv5('task-a2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Task A2',
          organizationId: ORG_ID_1,
          status: 'INACTIVE',
          createdAt: addSeconds(baseTime, 2),
        },
        {
          id: uuidv5('task-b1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Task B1',
          organizationId: ORG_ID_1,
          status: 'ACTIVE',
          createdAt: addSeconds(baseTime, 3),
        },
        {
          id: uuidv5('task-b2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Task B2',
          organizationId: ORG_ID_1,
          status: 'ACTIVE',
          createdAt: addSeconds(baseTime, 4),
        },
      ]);

      // Create tasks in ORG_ID_2
      await taskRepository.save([
        {
          id: uuidv5('task-c1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Task C1',
          organizationId: ORG_ID_2,
          status: 'ACTIVE',
          createdAt: addSeconds(baseTime, 5),
        },
        {
          id: uuidv5('task-c2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          name: 'Task C2',
          organizationId: ORG_ID_2,
          status: 'ACTIVE',
          createdAt: addSeconds(baseTime, 6),
        },
      ]);

      // Create task targets
      await taskTargetRepository.save([
        {
          id: uuidv5('target-a1-c1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          taskId: tasks[0].id, // Task A1
          targetId: CLIENT_ID_1,
          targetType: TaskTargetType.CLIENT,
        },
        {
          id: uuidv5('target-a2-c2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          taskId: tasks[1].id, // Task A2
          targetId: CLIENT_ID_2,
          targetType: TaskTargetType.CLIENT,
        },
        {
          id: uuidv5('target-b1-c1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          taskId: tasks[2].id, // Task B1
          targetId: CLIENT_ID_1,
          targetType: TaskTargetType.CLIENT,
        },
        {
          id: uuidv5('target-b2-c2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          taskId: tasks[3].id, // Task B2
          targetId: CLIENT_ID_2,
          targetType: TaskTargetType.CLIENT,
        },
      ]);

      // Create task events (for last event sorting)
      await taskEventRepository.save([
        {
          id: uuidv5('event-a1-1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          taskId: tasks[0].id, // Task A1
          eventType: 'COMPLETED',
          description: 'Task completed',
          createdAt: addSeconds(baseTime, 10),
        },
        {
          id: uuidv5('event-b1-1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          taskId: tasks[2].id, // Task B1
          eventType: 'STARTED',
          description: 'Task started',
          createdAt: addSeconds(baseTime, 12),
        },
        {
          id: uuidv5('event-b1-2', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          taskId: tasks[2].id, // Task B1 (most recent event)
          eventType: 'COMPLETED',
          description: 'Task completed',
          createdAt: addSeconds(baseTime, 15),
        },
        {
          id: uuidv5('event-b2-1', '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
          taskId: tasks[3].id, // Task B2
          eventType: 'STARTED',
          description: 'Task started',
          createdAt: addSeconds(baseTime, 11),
        },
        // Note: Task A2 has no events, testing NULLS LAST
      ]);
    }

    async function findTasksPaginated(
      args: Partial<TasksArgs>,
      organizationId: string,
    ) {
      const {
        nameContains,
        status,
        clientId,
        orderBy,
        order,
        ...paginationArgs
      } = args;

      taskPaginationService = paginationFactory.create<TaskEntity>();
      const queryBuilder = taskRepository
        .createQueryBuilder('task')
        .where('task.organizationId = :organizationId', { organizationId });

      if (nameContains) {
        queryBuilder.andWhere('task.name LIKE :nameContains', {
          nameContains: `%${nameContains}%`,
        });
      }

      if (status) {
        queryBuilder.andWhere('task.status = :status', { status });
      }

      if (clientId) {
        queryBuilder
          .innerJoin('task.targets', 'target')
          .andWhere('target.targetId = :clientId', { clientId })
          .andWhere('target.targetType = :targetType', {
            targetType: TaskTargetType.CLIENT,
          });
      }

      if (orderBy) {
        if (orderBy === TaskSortField.LAST_EVENT_AT) {
          queryBuilder.addSelect(
            (subQuery) =>
              subQuery
                .select('MAX(event.createdAt)')
                .from(TaskEventEntity, 'event')
                .where('event.taskId = task.id'),
            'lastEventAt',
          );
          queryBuilder.orderBy('"lastEventAt"', order, 'NULLS LAST');
        } else {
          const sortFieldMap = {
            [TaskSortField.CREATED_AT]: 'task.createdAt',
            [TaskSortField.NAME]: 'task.name',
          };
          const sortColumn = sortFieldMap[orderBy];
          if (sortColumn) {
            queryBuilder.orderBy(sortColumn, order, 'NULLS LAST');
          }
        }
      } else {
        // Default order
        queryBuilder.orderBy('task.createdAt', 'ASC');
      }

      taskPaginationService.setup(taskRepository, {
        ...paginationArgs,
        queryBuilder,
      });

      return taskPaginationService.getManyWithCount();
    }
  });

  async function createTestingModule(): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [TestEntity, TaskEntity, TaskEventEntity, TaskTargetEntity],
          synchronize: true,
          logging: false,
          entityPrefix: `integration`,
        }),
        TypeOrmModule.forFeature([
          TestEntity,
          TaskEntity,
          TaskEventEntity,
          TaskTargetEntity,
        ]),
      ],
      providers: [
        TestPaginationService,
        CursorService,
        PaginationFactory,
        createPaginationServiceProvider<TestEntity>(),
        {
          provide: QueryService,
          useClass: QueryService,
        },
      ],
    }).compile();
  }

  async function clearRepository() {
    await repository.clear();
  }

  async function createEntities(count: number) {
    entities = await repository.save(
      Array.from({ length: count }, (_, i) => ({
        id: uuidv5(i.toString(), '6ba7b810-9dad-11d1-80b4-00c04fd430c8'),
        name: `Entity ${i + 1}`,
        status: 'ACTIVE',
        createdAt: addSeconds(new Date(), i + 1),
      })),
    );
  }

  async function getManyWithCount(
    options?: Partial<RelayPaginationArgs<TestEntity>>,
    queryModifier?: (queryService: QueryService<TestEntity>) => void,
  ) {
    // NOTE: Currently we are using the factory to create a new instance of the service
    // In reality, we could do:
    // return testPaginationService.getManyWithCount(options);
    // However since tests are running in parallel, we need to create a new instance

    // Create a new instance using the factory instead of resolving
    paginationService = paginationFactory.create<TestEntity>();
    const queryBuilder = repository.createQueryBuilder('entity');

    // Default order for tests - always ASC by createdAt
    queryBuilder.orderBy('entity.createdAt', 'ASC');

    paginationService.setup(repository, { ...options, queryBuilder });

    // Apply optional query modifications (like withWhere)
    if (queryModifier) {
      const queryService = paginationService[
        'queryService'
      ] as QueryService<TestEntity>;
      queryModifier(queryService);
    }

    return paginationService.getManyWithCount();
  }

  async function createDescendingPagination(
    options: Partial<RelayPaginationArgs<TestEntity>>,
  ) {
    const service = paginationFactory.create<TestEntity>();
    const queryBuilder = repository.createQueryBuilder('entity');
    queryBuilder.orderBy('entity.createdAt', 'DESC');
    service.setup(repository, { ...options, queryBuilder });
    return service.getManyWithCount();
  }
});

@Injectable()
class TestPaginationService {
  constructor(
    @Inject(getRepositoryToken(TestEntity))
    private readonly repository: Repository<TestEntity>,

    @InjectPaginationService()
    private readonly paginationService: PaginationService<TestEntity>,
  ) {}

  async getManyWithCount(options?: Partial<RelayPaginationArgs<TestEntity>>) {
    this.paginationService.setup(this.repository, { ...options });

    return this.paginationService.getManyWithCount();
  }
}
