import { PageInfo } from './page-info.entity';
import {
  Edge,
  RelayPaginatedWithCount,
} from 'src/interfaces/relay-paginated.interface';
import { CursorFields } from './cursor-fields.entity';
import { Cursor, CursorOrderType } from './cursor.entity';
import { CursorService } from 'src/services/cursor.service';
import { RelayPaginationArgs } from 'src/args/relay-paginated.args';

export type PaginationResultOptions = {
  currentCount: number | undefined;
  previousCount: number | undefined;
};

interface PaginationResultParameters<Node> {
  instances: Node[];
  cursorFields: CursorFields<Node>;
  options: Partial<RelayPaginationArgs<Node>>;
  counts: PaginationResultOptions;
}

export class PaginationResult<Node> implements RelayPaginatedWithCount<Node> {
  public totalCount: number;
  public currentCount: number | undefined;
  public previousCount: number | undefined;
  public edges: Edge<Node>[];
  public pageInfo: PageInfo<Node>;

  private first: number | undefined;
  private last: number | undefined;
  private cursorFields: CursorFields<Node>;
  private hasCursor: boolean;

  constructor(
    private readonly cursorService: CursorService,
    parameters: PaginationResultParameters<Node>,
  ) {
    this.cursorFields = parameters.cursorFields;
    this.first = parameters.options.first;
    this.last = parameters.options.last;
    this.currentCount = parameters.counts.currentCount;
    this.previousCount = parameters.counts.previousCount;
    this.hasCursor = parameters.options.hasCursor;

    this.verifyConfiguration();

    this.totalCount = this.calculateTotalCount(parameters.counts);
    this.edges = this.createEdges(parameters.instances ?? []);
    this.pageInfo = this.createPageInfo();
  }

  private verifyConfiguration() {
    if (!this.cursorFields || typeof this.cursorFields !== 'object') {
      throw new Error('Invalid cursorFields provided');
    }

    if (this.first && this.last) {
      throw new Error('Cannot provide both first and last options');
    }

    if (this.first < 0 || this.last < 0) {
      throw new Error(
        'Cannot provide negative values for first or last options',
      );
    }
  }

  private calculateTotalCount(counts: PaginationResultOptions): number {
    const count = (counts.currentCount ?? 0) + (counts.previousCount ?? 0);

    return this.hasCursor ? count + 1 : count;
  }

  private createEdges(instances: Node[]): Edge<Node>[] {
    return instances.map((instance) => this.createEdge(instance));
  }

  private createEdge(instance: Node): Edge<Node> {
    return {
      node: instance,
      cursor: this.cursorService.encode(this.createCursor(instance)),
    };
  }

  private createCursor(instance: Node): Cursor {
    if (!instance) {
      throw new Error('Cannot encode cursor for undefined instance');
    }

    const idFieldName = this.cursorFields.idFieldName as keyof Node;
    const id = this.getInstanceId(instance, idFieldName);

    return new Cursor({
      orderBy: instance[this.cursorFields.orderByFieldName] as CursorOrderType,
      id: id as string,
    });
  }

  private getInstanceId(instance: Node, idFieldName: keyof Node): string {
    const id = instance[idFieldName];
    if (!id) {
      throw new Error(
        `Could not find id field '${String(idFieldName)}' in the instance of type '${typeof instance}'`,
      );
    }
    return id as string;
  }

  private createPageInfo() {
    return new PageInfo(this.edges, {
      hasPreviousPage: this.hasPreviousCount(),
      hasNextPage: this.hasNextPage(),
    });
  }

  private hasPreviousCount(): boolean {
    return this.previousCount > 0;
  }

  private hasNextPage(): boolean {
    if (this.isEdgesEmpty()) {
      return false;
    }

    if (!this.hasCount()) {
      return this.hasReturnedRequestedOrMore();
    }

    if (
      this.hasReturnedRequestedOrMore() &&
      this.isCurrentCountLargerThanRequested()
    ) {
      return true;
    }

    return this.hasPreviousCountUsingLast();
  }

  private isEdgesEmpty(): boolean {
    return this.edges.length === 0;
  }

  private hasCount(): boolean {
    return this.currentCount !== undefined && this.previousCount !== undefined;
  }

  private hasReturnedRequestedOrMore(): boolean {
    return this.edges.length >= this.first || this.edges.length >= this.last;
  }

  private isCurrentCountLargerThanRequested(): boolean {
    return this.currentCount > this.first;
  }

  private hasPreviousCountUsingLast(): boolean {
    return (
      this.hasLast() &&
      this.currentCount > this.last! &&
      this.previousCount !== 0
    );
  }

  private hasLast(): boolean {
    return this.last !== undefined;
  }
}
