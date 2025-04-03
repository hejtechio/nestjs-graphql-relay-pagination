import { RelayPaginationArgs } from '@/args/relay-paginated.args';
import { CursorFields } from '@/entities/cursor-fields.entity';
import { Cursor } from '@/entities/cursor.entity';
import { QueryOrderEnum } from '@/enums/query-order.enum';
import { RelayQueryBuilderPaginationOptions } from '@/interfaces/relay-paginated.interface';
import { Injectable, Logger } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';

@Injectable()
export class QueryService<Node> {
  private qb: SelectQueryBuilder<Node>;
  private repository: Repository<Node>;
  private cursor?: Cursor;
  private cursorFields: CursorFields<Node>;
  private arguments: Partial<RelayPaginationArgs<Node>>;

  public get hasCursor(): boolean {
    return !!this.cursor;
  }

  public get orderByFieldName(): string {
    return this.cursorFields.orderByFieldName;
  }

  public get idFieldName(): string {
    return this.cursorFields.idFieldName;
  }

  public get limit(): number {
    return Math.max(this.arguments.first ?? 0, this.arguments.last ?? 0);
  }

  public getCursorFields(): CursorFields<Node> {
    return this.cursorFields;
  }

  public setCursor(cursor?: Cursor): void {
    this.cursor = cursor;
  }

  public setQueryBuilder(queryBuilder: SelectQueryBuilder<Node>): void {
    this.qb = queryBuilder;
  }

  public getQueryBuilder(): SelectQueryBuilder<Node> {
    return this.qb;
  }

  public initialize(
    repository: Repository<Node>,
    options: RelayQueryBuilderPaginationOptions<Node>,
  ): void {
    this.qb = repository.createQueryBuilder();
    this.repository = repository;

    this.arguments = options;

    this.cursorFields = new CursorFields<Node>(
      options?.cursorFields?.id ?? this.getIdColumnPropertyName(),
      options.orderBy ?? this.getDateColumnPropertyName(),
    );
  }

  public async fetchEntitiesAndCount(): Promise<[number, Node[]]> {
    this.applyCursorFilters(this.qb);

    return Promise.all([this.fetchEntityCount(), this.fetchNodes()]);
  }

  public async fetchEntities(): Promise<Node[]> {
    this.applyCursorFilters(this.qb);

    return this.fetchNodes();
  }

  public async calculatePreviousCount(): Promise<number> {
    const previousQb = this.qb.clone();

    this.applyCursorFilters(previousQb, this.getOppositeComparisonOperator());

    return previousQb.getCount();
  }

  private getOppositeComparisonOperator() {
    return this.getComparisonOperator() === '>' ? '<' : '>';
  }

  private getComparisonOperator(): '>' | '<' {
    const orderDirection = this.arguments.order;
    const isAfter = this.cursor ? this.cursor.isAfter : true;

    if (orderDirection === QueryOrderEnum.ASC) {
      return isAfter ? '>' : '<';
    } else {
      return isAfter ? '<' : '>';
    }
  }

  private getDateColumnPropertyName(): string | undefined {
    return (
      this.repository.metadata.createDateColumn?.propertyName ?? 'createdAt'
    );
  }

  private getIdColumnPropertyName(): string | undefined {
    return this.repository.metadata.primaryColumns[0]?.propertyName ?? 'id';
  }

  private applyCursorFilters(
    qb: SelectQueryBuilder<Node>,
    comparisonOperator?: '>' | '<',
  ): void {
    if (!this.hasCursor) {
      return;
    }

    const comparison = comparisonOperator ?? this.getComparisonOperator();

    this.addOrderByCondition(qb, comparison);
  }

  private addOrderByCondition(
    qb: SelectQueryBuilder<Node>,
    comparison: '>' | '<',
  ): void {
    const alias = qb.alias;

    if (this.cursor.orderingByMultipleFields) {
      qb.andWhere(
        `(${alias}.${this.orderByFieldName} ${comparison} :afterField) 
       OR (${alias}.${this.orderByFieldName} = :afterField AND ${alias}.${this.idFieldName} ${comparison} :afterId)`,
        {
          afterField: this.cursor.orderBy,
          afterId: this.cursor.id,
        },
      );
    } else {
      qb.andWhere(`${alias}.${this.idFieldName} ${comparison} :afterField`, {
        afterField: this.cursor.id,
      });
    }
  }

  private fetchNodes(): Promise<Node[]> {
    this.warnIfFieldsNotIndexed();

    return this.qb.orderBy(this.getOrderBy()).limit(this.limit).getMany();
  }

  private warnIfFieldsNotIndexed(): void {
    if (this.hasUnindexedFields()) {
      Logger.warn(
        `The field(s) "${this.unindexedFields().join(
          ', ',
        )}" are not indexed. This can lead to performance issues in larger datasets. Consider running: CREATE INDEX ON "${this.repository.metadata.tableName}" ("${this.indexesUsed().join(
          '","',
        )}")`,
        this.constructor.name,
      );
    }
  }

  private hasUnindexedFields(): boolean {
    return this.unindexedFields().length > 0;
  }

  private unindexedFields(): string[] {
    return this.indexesUsed().filter(
      (index) => !this.getIndexedFields().has(index),
    );
  }

  private indexesUsed(): string[] {
    return [this.orderByFieldName, this.idFieldName].filter(Boolean);
  }

  private getIndexedFields(): Set<string> {
    return new Set([
      ...this.repository.metadata.indices
        .map((index) => index.columns)
        .map((columns) => columns[0].propertyName),
      ...this.repository.metadata.primaryColumns.map(
        (column) => column.propertyName,
      ),
    ]);
  }

  private getOrderBy(): { [key: string]: QueryOrderEnum } {
    return {
      [`${this.qb.alias}.${this.orderByFieldName}`]: this.getOrderDirection(),
      ...(this.orderByFieldName !== this.idFieldName && {
        [`${this.qb.alias}.${this.idFieldName}`]: QueryOrderEnum.ASC,
      }),
    };
  }

  private async fetchEntityCount(): Promise<number> {
    return this.cloneQueryBuilder().getCount();
  }

  private cloneQueryBuilder(): SelectQueryBuilder<Node> {
    return this.qb.clone();
  }

  private getOrderDirection(): QueryOrderEnum {
    if (this.arguments.hasLast) {
      return this.reverseOrder(this.arguments.order);
    }

    return this.arguments.order;
  }

  private reverseOrder(order: QueryOrderEnum): QueryOrderEnum {
    return order === QueryOrderEnum.ASC
      ? QueryOrderEnum.DESC
      : QueryOrderEnum.ASC;
  }
}
