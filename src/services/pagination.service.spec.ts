import { RelayPaginationArgs } from '../args/relay-paginated.args';
import { QueryOrderEnum } from '../enums/query-order.enum';
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
      limit: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
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
            service.initialize(mockRepository, {
              orderBy: 'created_at',
              order: 'ASC',
            } as RelayPaginationArgs<FakeNode>);
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
        new RelayPaginationArgs({ order: QueryOrderEnum.ASC, ...options }),
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
          new RelayPaginationArgs({ last: 10 }),
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
      order: QueryOrderEnum.ASC,
    });

    const result = await paginationService.getManyWithCount();

    expect(mockQueryBuilder.getCount).toHaveBeenCalledTimes(1);
    expect(result.edges.length).toBe(0);
  });
});
