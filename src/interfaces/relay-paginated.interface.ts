import { RelayPaginationArgs } from 'src/args/relay-paginated.args';
import { SelectQueryBuilder } from 'typeorm';

export interface Edge<Node> {
  cursor: string;
  node: Node;
}

export interface RelayPageInfo {
  endCursor: string;
  hasNextPage: boolean;
  startCursor: string;
  hasPreviousPage: boolean;
}

export interface RelayPaginated<Node> {
  edges: Edge<Node>[];
  pageInfo: RelayPageInfo;
}

export interface RelayPaginatedWithCount<Node> extends RelayPaginated<Node> {
  totalCount: number;
  previousCount: number;
  currentCount: number;
}

export interface RelayCursorFields<Node> {
  id: keyof Node;
}

export interface RelayQueryBuilderPaginationOptions<Node>
  extends Partial<RelayPaginationArgs<Node>> {
  cursorFields?: RelayCursorFields<Node>;
  queryBuilder?: SelectQueryBuilder<Node>;
}
