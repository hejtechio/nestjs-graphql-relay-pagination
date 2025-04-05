import { RelayPaginationArgs } from '../args/relay-paginated.args';
import { CursorService } from '../services/cursor.service';
import { beforeEach, describe, expect, it } from 'vitest';
import { CursorFields } from './cursor-fields.entity';
import { PaginationResult } from './pagination-result.entity';

type FakeNode = {
  id: string;
  created_at: Date;
};

describe('PaginationResult', () => {
  let cursorFields: CursorFields<FakeNode>;
  let instances: FakeNode[];
  let options;
  let counts: { currentCount: number; previousCount: number };
  let cursorService: CursorService;

  beforeEach(() => {
    cursorFields = new CursorFields<FakeNode>('id', 'created_at');
    instances = [
      { id: '1', created_at: new Date('2024-08-28T13:27:55.450Z') },
      { id: '2', created_at: new Date('2024-08-28T14:27:55.450Z') },
    ];
    options = {
      first: 2,
      last: 0,
      hasCursor: false,
    } as RelayPaginationArgs<FakeNode> as any;
    counts = { currentCount: 2, previousCount: 0 };

    cursorService = new CursorService();
  });

  it('should be defined', () => {
    const paginationResult = new PaginationResult(cursorService, {
      instances,
      cursorFields,
      options,
      counts,
    });
    expect(paginationResult).toBeDefined();
  });

  it('should create edges with correct cursors', () => {
    const paginationResult = new PaginationResult(cursorService, {
      instances,
      cursorFields,
      options,
      counts,
    });
    expect(paginationResult.edges.length).toBe(2);
    expect(paginationResult.edges[0].cursor).toBeDefined();
  });

  describe('totalCount', () => {
    it('should correctly calculate total count with cursor', () => {
      const paginationResult = new PaginationResult(cursorService, {
        instances,
        cursorFields,
        options: { ...options, hasCursor: true },
        counts: { currentCount: 2, previousCount: 2 },
      });

      expect(paginationResult.totalCount).toBe(5);
    });

    it('should correctly calculate total count without cursor', () => {
      const paginationResult = new PaginationResult(cursorService, {
        instances,
        cursorFields,
        options: { ...options, hasCursor: false },
        counts: { currentCount: 2, previousCount: 2 },
      });

      expect(paginationResult.totalCount).toBe(4);
    });
  });

  it('should create PageInfo with correct flags', () => {
    const paginationResult = new PaginationResult(cursorService, {
      instances,
      cursorFields,
      options,
      counts,
    });
    const pageInfo = paginationResult.pageInfo;

    expect(pageInfo.hasPreviousPage).toBe(false);
    expect(pageInfo.hasNextPage).toBe(false);
  });

  it('should indicate there are more pages when applicable', () => {
    const paginationResult = new PaginationResult(cursorService, {
      instances,
      cursorFields,
      options: { ...options, first: 1 },
      counts,
    });
    expect(paginationResult.pageInfo.hasNextPage).toBe(true);
  });

  it('should throw an error when creating a cursor for an invalid instance', () => {
    const invalidInstance = { created_at: new Date() } as FakeNode;

    expect(
      () =>
        new PaginationResult(cursorService, {
          instances: [invalidInstance],
          cursorFields,
          options,
          counts,
        }),
    ).toThrowError(
      `Could not find id field 'id' in the instance of type 'object'`,
    );
  });

  it('should handle undefined counts gracefully', () => {
    const paginationResult = new PaginationResult(cursorService, {
      instances: [],
      cursorFields,
      options,
      counts: { currentCount: undefined, previousCount: undefined },
    });
    expect(paginationResult.totalCount).toBe(0);
    expect(paginationResult.pageInfo.hasNextPage).toBe(false);
  });

  it('should handle empty instances array', () => {
    const paginationResult = new PaginationResult(cursorService, {
      instances: [],
      cursorFields,
      options,
      counts,
    });

    expect(paginationResult.edges).toHaveLength(0);
    expect(paginationResult.pageInfo.startCursor).toBe('');
    expect(paginationResult.pageInfo.endCursor).toBe('');
  });

  it('should correctly identify if there is a previous count', () => {
    const paginationResultWithPrevious = new PaginationResult(cursorService, {
      instances,
      cursorFields,
      options,
      counts: { currentCount: 2, previousCount: 1 },
    });
    expect(paginationResultWithPrevious.pageInfo.hasPreviousPage).toBe(true);

    const paginationResultWithoutPrevious = new PaginationResult(
      cursorService,
      {
        instances,
        cursorFields,
        options,
        counts: { currentCount: 2, previousCount: 0 },
      },
    );
    expect(paginationResultWithoutPrevious.pageInfo.hasPreviousPage).toBe(
      false,
    );
  });

  it('should handle a single instance correctly', () => {
    const singleInstance = [
      { id: '1', created_at: new Date('2024-08-28T13:27:55.450Z') },
    ];

    const paginationResult = new PaginationResult(cursorService, {
      instances: singleInstance,
      cursorFields,
      options,
      counts,
    });

    expect(paginationResult.edges).toHaveLength(1);
    expect(paginationResult.pageInfo.startCursor).toBeDefined();
    expect(paginationResult.pageInfo.endCursor).toBeDefined();
  });

  it('should throw error when both first and last options are provided', () => {
    expect(
      () =>
        new PaginationResult(cursorService, {
          instances,
          cursorFields,
          options: { ...options, last: 1 },
          counts,
        }),
    ).toThrowError('Cannot provide both first and last options');
  });
});
