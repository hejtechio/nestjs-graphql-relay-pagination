export class CursorFields<Node> {
  constructor(
    private readonly _idFieldName: keyof Node | string,
    private readonly _orderByFieldName: keyof Node | string,
  ) {}

  public get orderByFieldName(): string | undefined {
    return this._orderByFieldName ? String(this._orderByFieldName) : undefined;
  }

  public get idFieldName(): string {
    return String(this._idFieldName);
  }
}
