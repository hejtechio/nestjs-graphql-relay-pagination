import { describe, it, expect } from 'vitest';
import { PageInfo } from './page-info.entity';
import { Edge } from '@/interfaces/relay-paginated.interface';
import { ObjectLiteral } from 'typeorm';

// Mock ObjectLiteral type for the test
interface MockNode extends ObjectLiteral {
  id: string;
}

// Mock Edge type for the test
const createMockEdge = (cursor: string): Edge<MockNode> => ({
  cursor,
  node: { id: '1' },
});

describe('PageInfo', () => {
  it('should set startCursor and endCursor based on edges', () => {
    const edges: Edge<MockNode>[] = [
      createMockEdge('cursor1'),
      createMockEdge('cursor2'),
    ];

    const pageInfo = new PageInfo(edges, {
      hasPreviousPage: false,
      hasNextPage: true,
    });

    expect(pageInfo.startCursor).toBe('cursor1');
    expect(pageInfo.endCursor).toBe('cursor2');
    expect(pageInfo.hasPreviousPage).toBe(false);
    expect(pageInfo.hasNextPage).toBe(true);
  });

  it('should handle an empty edges array', () => {
    const edges: Edge<MockNode>[] = [];

    const pageInfo = new PageInfo(edges);

    expect(pageInfo.startCursor).toBe('');
    expect(pageInfo.endCursor).toBe('');
    expect(pageInfo.hasPreviousPage).toBe(false);
    expect(pageInfo.hasNextPage).toBe(false);
  });

  it('should correctly set hasPreviousPage and hasNextPage based on options', () => {
    const edges: Edge<MockNode>[] = [createMockEdge('cursor1')];

    const pageInfo = new PageInfo(edges, {
      hasPreviousPage: true,
      hasNextPage: false,
    });

    expect(pageInfo.startCursor).toBe('cursor1');
    expect(pageInfo.endCursor).toBe('cursor1');
    expect(pageInfo.hasPreviousPage).toBe(true);
    expect(pageInfo.hasNextPage).toBe(false);
  });
});
