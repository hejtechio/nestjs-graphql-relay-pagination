import {
  PaginationResult,
  PaginationResultOptions,
} from '@/entities/pagination-result.entity';
import { CursorFields } from '@/entities/cursor-fields.entity';
import { CursorService } from './cursor.service';
import { RelayPaginationArgs } from '@/args/relay-paginated.args';

export class RelayService<Node> {
  private instances: Node[] = [];
  private counts: PaginationResultOptions = {
    currentCount: undefined,
    previousCount: undefined,
  };
  private cursorFields: CursorFields<Node>;
  private arguments: Partial<RelayPaginationArgs<Node>>;
  private cursorService: CursorService;

  constructor(parameters: {
    cursorFields: CursorFields<Node>;
    args: Partial<RelayPaginationArgs<Node>>;
    cursorService: CursorService;
  }) {
    this.cursorFields = parameters.cursorFields;
    this.arguments = parameters.args;
    this.cursorService = parameters.cursorService;
  }

  public setInstances(instances: Node[]): void {
    this.instances = instances;
  }

  public setCounts(currentCount: number, previousCount: number): void {
    this.counts = { currentCount, previousCount };
  }

  public buildPaginationResult(): PaginationResult<Node> {
    return new PaginationResult<Node>(this.cursorService, {
      instances: this.arguments.hasLast
        ? this.instances.reverse()
        : this.instances,
      cursorFields: this.cursorFields,
      options: this.arguments,
      counts: this.counts,
    });
  }
}
