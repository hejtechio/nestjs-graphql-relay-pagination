import { RelayPaginationArgs } from '../args/relay-paginated.args';
import { Test, TestingModule } from '@nestjs/testing';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Mock } from 'vitest';
import { CursorService } from './cursor.service';
import { PaginationService } from './pagination.service';
import { QueryService } from './query.service';
import { RelayService } from './relay.service';

type FakeNode = {
  id: string;
  created_at: Date;
};

describe('PaginationService', () => {
  let paginationService: PaginationService<FakeNode>;

  let mockQueryBuilder: Partial<Record<keyof SelectQueryBuilder<any>, Mock>>;
  let mockRepository: Repository<FakeNode>;
  let setup: (options: Partial<RelayPaginationArgs<FakeNode>>) => void;

  beforeEach(async () => {
    // Mock implementations
    mockQueryBuilder = {
      clone: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      orWhere: vi.fn().mockReturnThis(),
      getCount: vi.fn(),
      getMany: vi.fn(),
      orderBy: vi.fn().mockReturnThis(),
      addOrderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      connection: {
        driver: {
          escape: vi.fn((identifier: string) => `"${identifier}"`),
        },
      } as any,
      expressionMap: {
        orderBys: {},
      } as any,
    };

    mockRepository = {
      createQueryBuilder: vi.fn().mockReturnValue(mockQueryBuilder),
      metadata: {
        createDateColumn: { propertyName: 'created_at' },
        primaryColumns: [{ propertyName: 'id' }],
        indices: [{ columns: ['created_at', 'id'] }],
      },
    } as any;

    // Test Module Setup
    const moduleReference: TestingModule = await Test.createTestingModule({
      providers: [
        CursorService,
        {
          provide: QueryService,
          useFactory: () => {
            const service = new QueryService<FakeNode>();
            service.initialize(mockRepository, {});
            return service;
          },
        },
        {
          provide: RelayService,
          useFactory: (
            queryService: QueryService<FakeNode>,
            cursorService: CursorService,
          ) => {
            return new RelayService<FakeNode>({
              cursorFields: queryService.getCursorFields(),
              args: {},
              cursorService: cursorService,
            });
          },
          inject: [QueryService, CursorService],
        },
        {
          provide: PaginationService,
          useFactory: (
            queryService: QueryService<FakeNode>,
            cursorService: CursorService,
          ) => {
            return new PaginationService<FakeNode>(queryService, cursorService);
          },
          inject: [QueryService, CursorService],
        },
      ],
    }).compile();

    paginationService =
      await moduleReference.resolve<PaginationService<FakeNode>>(
        PaginationService,
      );

    setup = (options: Partial<RelayPaginationArgs<FakeNode>>) =>
      paginationService.setup(
        mockRepository,
        RelayPaginationArgs.create({ ...options }),
      );
  });

  it('should be defined', () => {
    expect(paginationService).toBeDefined();
  });

  describe('setup', () => {
    it('should throw an error if last is set without a cursor', async () => {
      expect(() =>
        paginationService.setup(
          mockRepository,
          RelayPaginationArgs.create({ last: 10 }),
        ),
      ).toThrowError('Cannot paginate backwards without a cursor');
    });
  });

  describe('relayQueryBuilderPaginationWithTotalCount', () => {
    beforeEach(async () => {
      mockQueryBuilder.getCount!.mockResolvedValueOnce(2);
      mockQueryBuilder.getMany!.mockResolvedValueOnce([
        { created_at: new Date('2024-08-28T13:27:55.450Z'), id: 'id-1' },
        { created_at: new Date('2024-08-28T14:27:55.450Z'), id: 'id-2' },
      ]);
    });

    it('should correctly handle the query for paginated results', async () => {
      setup({
        first: 2,
      });

      vi.spyOn(mockQueryBuilder, 'getCount');
      vi.spyOn(mockQueryBuilder, 'getMany');

      const result = await paginationService.getManyWithCount();

      expect(mockQueryBuilder.getCount).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });

    it('should count twice if a cursor is provided', async () => {
      setup({
        first: 2,
        after: 'Y3Vyc',
      });

      vi.spyOn(mockQueryBuilder, 'getCount');
      vi.spyOn(mockQueryBuilder, 'getMany');

      const result = await paginationService.getManyWithCount();

      expect(mockQueryBuilder.getCount).toHaveBeenCalledTimes(2);
      expect(mockQueryBuilder.getMany).toHaveBeenCalledTimes(1);
      expect(result).toBeDefined();
    });
  });

  it('works with no entities returned', async () => {
    mockQueryBuilder.getMany!.mockResolvedValueOnce([]);

    vi.spyOn(mockQueryBuilder, 'getCount');
    vi.spyOn(mockQueryBuilder, 'getMany');

    setup({
      first: 100,
    });

    const result = await paginationService.getManyWithCount();

    expect(mockQueryBuilder.getCount).toHaveBeenCalledTimes(1);
    expect(result.edges.length).toBe(0);
  });

  describe('withWhere', () => {
    it('should add multiple where conditions using withWhere method', () => {
      setup({ first: 10 });

      const queryService = paginationService[
        'queryService'
      ] as QueryService<FakeNode>;
      vi.spyOn(mockQueryBuilder, 'andWhere');

      queryService.withWhere({
        organizationId: 'test-org-id',
        status: 'ACTIVE',
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(2);

      // Check first call for organizationId (now escaped with quotes)
      const firstCall = mockQueryBuilder.andWhere.mock.calls[0];
      expect(firstCall[0]).toMatch(/"organizationId" = :/);
      expect(Object.values(firstCall[1])).toContain('test-org-id');

      // Check second call for status (now escaped with quotes)
      const secondCall = mockQueryBuilder.andWhere.mock.calls[1];
      expect(secondCall[0]).toMatch(/"status" = :/);
      expect(Object.values(secondCall[1])).toContain('ACTIVE');
    });

    it('should return this for method chaining', () => {
      setup({ first: 10 });

      const queryService = paginationService[
        'queryService'
      ] as QueryService<FakeNode>;
      const result = queryService.withWhere({ id: '123' });

      expect(result).toBe(queryService);
    });

    it('should use TypeORM escaping for field names to prevent SQL injection', () => {
      setup({ first: 10 });

      const queryService = paginationService[
        'queryService'
      ] as QueryService<FakeNode>;

      // Mock the connection driver escape method
      const mockEscape = vi.fn((identifier: string) => `"${identifier}"`);
      (queryService.getQueryBuilder().connection.driver as any).escape =
        mockEscape;

      vi.spyOn(mockQueryBuilder, 'andWhere');

      queryService.withWhere({
        potentially_dangerous_field: 'value',
      });

      // Verify that the escape method was called for the field name
      expect(mockEscape).toHaveBeenCalledWith('potentially_dangerous_field');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1);

      // Verify the escaped field name is used in the query
      const andWhereCall = mockQueryBuilder.andWhere.mock.calls[0];
      expect(andWhereCall[0]).toContain('"potentially_dangerous_field"');
    });
  });
});
