/* eslint-disable @stylistic/js/max-len */
/* eslint-disable max-lines */
import { RelayPaginationArgs } from 'src/args/relay-paginated.args';
import {
  createPaginationServiceProvider,
  InjectPaginationService,
} from 'src/decorators/pagination-service.decorator';
import { QueryOrderEnum } from 'src/enums/query-order.enum';
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

describe('PaginationService Integration Test', () => {
  let paginationFactory: PaginationFactory;
  let paginationService: PaginationService<TestEntity>;
  let repository: Repository<TestEntity>;
  let entities: TestEntity[] = [];
  let module: TestingModule;
  let testPaginationService: TestPaginationService;

  beforeAll(async () => {
    module = await createTestingModule();
    repository = module.get(getRepositoryToken(TestEntity));
    paginationFactory = module.get(PaginationFactory);
    testPaginationService = module.get(TestPaginationService);
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
    const firstPage = await paginate({ first: 2 });

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

    const secondPage = await paginate({
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

    const lastPage = await paginate({
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
    const firstPage = await paginate({ first: 5 });

    expect(firstPage).toMatchObject({
      edges: expect.any(Array),
      currentCount: 10,
      previousCount: 0,
      pageInfo: {
        hasNextPage: true,
        hasPreviousPage: false,
      },
    });

    const afterPage = await paginate({ after: firstPage.edges[0].cursor });

    expect(afterPage).toMatchObject({
      edges: expect.any(Array),
    });
    expect(afterPage.edges[0].node.name).toBe(entities[1].name);

    const beforePage = await paginate({ before: firstPage.edges[1].cursor });

    expect(beforePage).toMatchObject({
      edges: expect.any(Array),
    });
    expect(beforePage.edges[0].node.name).toBe(entities[0].name);
  });

  it('should set correct pageInfo', async () => {
    await createEntities(5);
    const firstPage = await paginate({ first: 5 });

    expect(firstPage).toMatchObject({
      edges: expect.any(Array),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
      },
    });

    const emptyPage = await paginate({ after: firstPage.pageInfo.endCursor });

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
    const pageWithoutFirstOrLast = await paginate();

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

    const ascendingPage = await paginate({
      first: 5,
      order: QueryOrderEnum.ASC,
    });
    expect(ascendingPage.edges[0].node.name).toBe(entities[0].name);

    const descendingPage = await paginate({ order: QueryOrderEnum.DESC });
    expect(descendingPage.edges[0].node.name).toBe(entities[4].name);
  });

  it('should paginate entities forward correctly with first and after', async () => {
    await createEntities(10);

    // Fetch the first 5 entities
    const firstPage = await paginate({ first: 5 });

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
    const secondPage = await paginate({
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

    const page = await paginate({ first: 3 });

    expect(page.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
      startCursor: expect.any(String),
      endCursor: expect.any(String),
    });

    const nextPage = await paginate({
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

    const page = await paginate({ first: 3 });

    expect(page.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false,
    });

    await expect(paginate({ last: 3 })).rejects.toThrow();
  });

  it('should maintain consistent edge order with first/after and last/before', async () => {
    await createEntities(5);

    // Forward pagination
    const forwardPage = await paginate({ first: 5 });

    expect(forwardPage.edges[0].node.name).toBe(entities[0].name);
    expect(forwardPage.edges[4].node.name).toBe(entities[4].name);

    // Backward pagination
    const backwardPage = await paginate({
      last: 2,
      before: forwardPage.pageInfo.endCursor,
    });

    expect(backwardPage.edges.length).toBe(2);

    expect(backwardPage.edges[0].node.name).toBe(entities[2].name);
    expect(backwardPage.edges[1].node.name).toBe(entities[3].name);
  });

  it('should throw an error for invalid pagination arguments', async () => {
    await createEntities(5);

    await expect(paginate({ first: -1 })).rejects.toThrow();

    await expect(paginate({ last: -1 })).rejects.toThrow();
  });

  it('should correctly set hasPreviousPage and hasNextPage fields', async () => {
    await createEntities(10);

    // Test forward pagination (first 5)
    const firstPage = await paginate({ first: 5 });

    expect(firstPage.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: false, // No previous pages because we're at the start
    });

    // Paginate to the next set (forward)
    const secondPage = await paginate({
      first: 3,
      after: firstPage.pageInfo.endCursor,
    });

    expect(secondPage.pageInfo).toMatchObject({
      hasNextPage: true,
      hasPreviousPage: true, // There are previous pages
    });

    // Paginate to the last set (forward)
    const lastPage = await paginate({
      first: 2,
      after: secondPage.pageInfo.endCursor,
    });

    expect(lastPage.pageInfo).toMatchObject({
      hasNextPage: false, // No more pages after this
      hasPreviousPage: true,
    });

    // Test backward pagination (last 5)
    const backwardPage = await paginate({
      last: 5,
      before: firstPage.pageInfo.endCursor,
    });

    expect(backwardPage.pageInfo).toMatchObject({
      hasNextPage: false, // No "next" in the context of backward pagination
      hasPreviousPage: true, // There are previous pages
    });

    // Paginate to the previous set (backward)
    const previousPage = await paginate({
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
    const firstPage = await paginate({
      first: 2,
      order: QueryOrderEnum.DESC,
    });

    expect(firstPage.edges).toHaveLength(2);
    expect(firstPage.edges[0].node.name).toBe('Entity 5');
    expect(firstPage.edges[1].node.name).toBe('Entity 4');

    // Paginate the next 2 entities using the end cursor of the first page
    const secondPage = await paginate({
      first: 2,
      after: firstPage.pageInfo.endCursor,
      order: QueryOrderEnum.DESC,
    });

    expect(secondPage.edges).toHaveLength(2);
    expect(secondPage.edges[0].node.name).toBe('Entity 3');
    expect(secondPage.edges[1].node.name).toBe('Entity 2');

    // Paginate the last entity
    const lastPage = await paginate({
      first: 2,
      after: secondPage.pageInfo.endCursor,
      order: QueryOrderEnum.DESC,
    });

    expect(lastPage.edges).toHaveLength(1);
    expect(lastPage.edges[0].node.name).toBe('Entity 1');
  });

  async function createTestingModule(): Promise<TestingModule> {
    return Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'cockroachdb',
          entities: [TestEntity],
          url: `postgresql://root:passwd@localhost:26256/defaultdb`,
          synchronize: true,
          logging: false,
          entityPrefix: `integration`,
        }),
        TypeOrmModule.forFeature([TestEntity]),
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
        createdAt: addSeconds(new Date(), i + 1).toISOString(),
      })),
    );
  }

  async function paginate(options?: Partial<RelayPaginationArgs<TestEntity>>) {
    // NOTE: Currently we are using the factory to create a new instance of the service
    // In reality, we could do:
    // return testPaginationService.paginate(options);
    // However since tests are running in parallel, we need to create a new instance

    // Create a new instance using the factory instead of resolving
    paginationService = paginationFactory.create<TestEntity>();

    paginationService.setup(
      repository,
      new RelayPaginationArgs({
        order: QueryOrderEnum.ASC,
        ...options,
      }),
    );

    return paginationService.getManyWithCount();
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

  async paginate(options?: Partial<RelayPaginationArgs<TestEntity>>) {
    this.paginationService.setup(
      this.repository,
      new RelayPaginationArgs({
        order: QueryOrderEnum.ASC,
        ...options,
      }),
    );

    return this.paginationService.getManyWithCount();
  }
}
