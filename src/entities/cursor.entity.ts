export enum CursorType {
  AFTER = 'after',
  BEFORE = 'before',
  UNKNOWN = 'unknown',
}

export enum CursorFieldFormat {
  STRING = 'string',
  DATE = 'date',
  NUMBER = 'number',
}

export type CursorOrderType = string | Date | number;

export class Cursor {
  private readonly _id: string;
  private readonly _orderBy: CursorOrderType | undefined;
  private readonly _type?: CursorType;

  constructor(fields: {
    id: string;
    orderBy?: CursorOrderType;
    type?: CursorType;
  }) {
    this._id = fields.id;
    this._orderBy = fields.orderBy;
    this._type = fields.type;
  }

  public get id(): string {
    return this._id;
  }

  public get orderBy(): CursorOrderType {
    return this._orderBy;
  }

  public get isBefore(): boolean {
    return this._type === CursorType.BEFORE;
  }

  public get isAfter(): boolean {
    return this._type === CursorType.AFTER;
  }

  public get orderingByMultipleFields(): boolean {
    return this.orderBy !== undefined && this.orderBy !== this.id;
  }

  public static fromAfterString(
    cursor: string,
    orderBy?: CursorOrderType,
  ): Cursor {
    return new Cursor({
      id: cursor,
      type: CursorType.AFTER,
      orderBy,
    });
  }

  public static fromBeforeString(
    cursor: string,
    orderBy?: CursorOrderType,
  ): Cursor {
    return new Cursor({
      id: cursor,
      type: CursorType.BEFORE,
      orderBy,
    });
  }
}
