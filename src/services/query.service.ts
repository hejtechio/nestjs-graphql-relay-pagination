import { RelayPaginationArgs } from '../args/relay-paginated.args';
import { CursorFields } from '../entities/cursor-fields.entity';
import { Cursor } from '../entities/cursor.entity';
import { RelayQueryBuilderPaginationOptions } from '../interfaces/relay-paginated.interface';
import { Injectable, Logger } from '@nestjs/common';
import { Repository, SelectQueryBuilder } from 'typeorm';

type Order = 'ASC' | 'DESC';

@Injectable()
export class QueryService<Node> {
  private qb: SelectQueryBuilder<Node>;
  private repository: Repository<Node>;
  private cursor?: Cursor;
  private cursorFields?: CursorFields<Node>;
  private arguments: Partial<RelayPaginationArgs<Node>>;

  public get hasCursor(): boolean {
    return !!this.cursor;
  }

  public get orderByFieldName(): string {
    return this.getPrimarySortField();
  }

  public get idFieldName(): string {
    return this.cursorFields.idFieldName;
  }

  public get limit(): number {
    return Math.max(this.arguments.first ?? 0, this.arguments.last ?? 0);
  }

  public getCursorFields(): CursorFields<Node> {
    if (!this.cursorFields) {
      // Create cursor fields lazily, using primary sort field from QB
      const orderByField = this.getPrimarySortField();
      this.cursorFields = new CursorFields<Node>(
        this.getIdColumnPropertyName(),
        orderByField,
      );
    }
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

  public withWhere(conditions: Record<string, any>): this {
    const alias = this.qb.alias;
    const connection = this.qb.connection;

    for (const [field, value] of Object.entries(conditions)) {
      const parameterName = `${field}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

      // Use TypeORM's built-in escaping for column names to prevent
      // SQL injection
      const escapedField = connection.driver.escape(field);
      const fieldExpression = alias
        ? `${connection.driver.escape(alias)}.${escapedField}`
        : escapedField;

      this.qb.andWhere(`${fieldExpression} = :${parameterName}`, {
        [parameterName]: value,
      });
    }

    return this;
  }

  public initialize(
    repository: Repository<Node>,
    options: RelayQueryBuilderPaginationOptions<Node>,
  ): void {
    this.qb = repository.createQueryBuilder();
    this.repository = repository;
    this.arguments = options;
    // Don't initialize cursorFields here - we'll do it lazily
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

    const count = await previousQb.getCount();

    // Include the cursor item itself in the previous count
    return count + 1;
  }

  private getPrimarySortField(): string {
    const orderBys = this.qb.expressionMap.orderBys;
    if (Object.keys(orderBys).length === 0) {
      const fallbackField =
        this.getDateColumnPropertyName() ?? this.getIdColumnPropertyName();
      if (!fallbackField) {
        throw new Error(
          'Could not determine a fallback sort field. Please specify an order.',
        );
      }

      this.qb.addOrderBy(`${this.qb.alias}.${fallbackField}`, 'DESC');

      return fallbackField;
    }
    const [field] = Object.keys(orderBys)[0].split('.').slice(-1);
    return field;
  }

  private getOppositeComparisonOperator() {
    return this.getComparisonOperator() === '>' ? '<' : '>';
  }

  private getComparisonOperator(): '>' | '<' {
    const orderDirection = this.getOrderDirection();
    const isAfter = this.cursor ? this.cursor.isAfter : true;
    if (orderDirection === 'ASC') {
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
    if (!this.hasCursor) return;
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
        `(${alias}.${this.orderByFieldName} ${comparison} :afterField) OR (${alias}.${this.orderByFieldName} = :afterField AND ${alias}.${this.idFieldName} ${comparison} :afterId)`,
        { afterField: this.cursor.orderBy, afterId: this.cursor.id },
      );
    } else {
      qb.andWhere(`${alias}.${this.idFieldName} ${comparison} :afterField`, {
        afterField: this.cursor.id,
      });
    }
  }

  private fetchNodes(): Promise<Node[]> {
    this.warnIfFieldsNotIndexed();
    return this.qb.limit(this.limit).getMany();
  }

  private warnIfFieldsNotIndexed(): void {
    if (this.hasUnindexedFields()) {
      Logger.warn(
        `The field(s) "${this.unindexedFields().join(
          ', ',
        )}" are not indexed. This can lead to performance issues in larger datasets. Consider running: CREATE INDEX ON "${
          this.repository.metadata.tableName
        }" ("${this.indexesUsed().join('","')}")`,
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

  private async fetchEntityCount(): Promise<number> {
    return this.cloneQueryBuilder().getCount();
  }

  private cloneQueryBuilder(): SelectQueryBuilder<Node> {
    return this.qb.clone();
  }

  private getOrderDirection(): Order {
    if (this.arguments.hasLast) {
      return this.reverseOrder(this.getPrimarySortDirection());
    }
    return this.getPrimarySortDirection();
  }

  private getPrimarySortDirection(): Order {
    const orderBys = this.qb.expressionMap.orderBys;
    const firstOrderBy = Object.values(orderBys)[0];

    if (typeof firstOrderBy === 'object' && firstOrderBy.order) {
      return firstOrderBy.order;
    }

    return firstOrderBy as Order;
  }

  private reverseOrder(order: Order): Order {
    return order === 'ASC' ? 'DESC' : 'ASC';
  }
}
