import { Edge } from '../interfaces/relay-paginated.interface';
import { ObjectLiteral } from 'typeorm';

export class PageInfo<Node extends ObjectLiteral> {
  startCursor: string;
  endCursor: string;
  hasPreviousPage: boolean;
  hasNextPage: boolean;

  constructor(
    edges: Edge<Node>[],
    options: {
      hasPreviousPage: boolean;
      hasNextPage: boolean;
    } = {} as any,
  ) {
    this.startCursor = edges.length > 0 ? edges[0].cursor : '';
    this.endCursor = edges.length > 0 ? edges.at(-1).cursor : '';
    this.hasPreviousPage = options.hasPreviousPage || false;
    this.hasNextPage = options.hasNextPage || false;
  }
}
