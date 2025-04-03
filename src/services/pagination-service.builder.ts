import { RelayPaginationArgs } from '@/args/relay-paginated.args';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ObjectLiteral } from 'typeorm/common/ObjectLiteral';
import { PaginationService } from './pagination.service';

export class PaginationServiceBuilder<Node extends ObjectLiteral> {
  private args: Partial<RelayPaginationArgs<Node>>;
  private queryBuilder: SelectQueryBuilder<Node> | undefined;

  constructor(
    private readonly paginationService: PaginationService<Node>,
    private readonly repository: Repository<Node>,
  ) {}

  public withQueryBuilder(queryBuilder: SelectQueryBuilder<Node>): this {
    this.queryBuilder = queryBuilder;
    return this;
  }

  public withArguments(args: Partial<RelayPaginationArgs<Node>>): this {
    this.args = args;
    return this;
  }

  public build(): PaginationService<Node> {
    this.paginationService.setup(this.repository, {
      ...this.args,
      queryBuilder: this.queryBuilder,
    });

    return this.paginationService;
  }
}
