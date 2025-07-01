import { Cursor } from '../entities/cursor.entity';
import { RelayPaginationArgs } from '../args/relay-paginated.args';
import {
  RelayPaginated,
  RelayPaginatedWithCount,
  RelayQueryBuilderPaginationOptions,
} from '../interfaces/relay-paginated.interface';
import { Injectable } from '@nestjs/common';
import { ObjectLiteral, Repository } from 'typeorm';
import { CursorService } from './cursor.service';
import { QueryService } from './query.service';
import { RelayService } from './relay.service';

@Injectable()
export class PaginationService<Node extends ObjectLiteral> {
  private relayService: RelayService<Node>;
  private arguments: Partial<RelayPaginationArgs<Node>>;

  constructor(
    private readonly queryService: QueryService<Node>,
    private readonly cursorService: CursorService,
  ) {}

  private get hasCursor(): boolean {
    return !!this.arguments?.after || !!this.arguments?.before;
  }

  public getQueryBuilder() {
    return this.queryService.getQueryBuilder();
  }

  public setup(
    repository: Repository<Node>,
    args?: RelayQueryBuilderPaginationOptions<Node>,
  ) {
    this.setArguments(args);

    this.initializeServices(repository, args);

    this.verifyConfiguration();
  }

  public async getManyWithCount(): Promise<RelayPaginatedWithCount<Node>> {
    const previousCount = this.hasCursor
      ? await this.queryService.calculatePreviousCount()
      : 0;

    const [count, entities] = await this.queryService.fetchEntitiesAndCount();

    this.relayService.setCounts(count, previousCount);
    this.relayService.setInstances(entities);

    return this.relayService.buildPaginationResult();
  }

  public async getMany(): Promise<RelayPaginated<Node>> {
    const entities = await this.queryService.fetchEntities();

    this.relayService.setInstances(entities);

    return this.relayService.buildPaginationResult();
  }

  private setArguments(args: Partial<RelayPaginationArgs<Node>>): void {
    let cursor: Cursor | undefined;

    if (args.after) {
      cursor = this.cursorService.createCursorFromAfterString(args.after);
    } else if (args.before) {
      cursor = this.cursorService.createCursorFromBeforeString(args.before);
    }

    this.queryService.setCursor(cursor);

    // Extract only RelayPaginationArgs properties and use factory method
    const { first, last, after, before } = args;
    this.arguments = RelayPaginationArgs.create<Node>({
      first,
      last,
      after,
      before,
    });
  }

  private initializeServices(
    repository: Repository<Node>,
    options?: RelayQueryBuilderPaginationOptions<Node>,
  ): void {
    this.queryService.initialize(repository, this.arguments);

    if (options?.queryBuilder) {
      this.queryService.setQueryBuilder(options.queryBuilder);
    }

    this.relayService = new RelayService<Node>({
      cursorFields: this.queryService.getCursorFields(),
      args: this.arguments,
      cursorService: this.cursorService,
    });
  }

  private verifyConfiguration(): void {
    if (this.hasLastWithoutCursor()) {
      // TODO: We could add a feature to allow the user to paginate
      // backwards without a cursor, by simply fetching the last N
      // However, that would require relay.service to be aware
      // of whether or not a cursor is present
      // so the hasPreviousPage can be set to false (it's safe to
      // assume that if there's no cursor and last is set, there's
      // no previous page)
      throw new Error('Cannot paginate backwards without a cursor');
    }

    const hasFirst = !!this.arguments.first;
    const hasLast = !!this.arguments.last;

    if (hasFirst && this.arguments.first <= 0) {
      throw new Error('First must be a positive number');
    }

    if (hasLast && this.arguments.last <= 0) {
      throw new Error('Last must be a positive number');
    }
  }

  private hasLastWithoutCursor(): boolean {
    const hasLast = !!this.arguments.last;
    return hasLast && !this.hasCursor;
  }
}
