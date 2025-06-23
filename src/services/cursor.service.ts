import {
  Cursor,
  CursorFieldFormat,
  CursorOrderType,
} from '../entities/cursor.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CursorService {
  public static SEPARATOR = '<!@@!>';

  public createCursorFromBeforeString(cursorString: string): Cursor {
    const { orderBy, id } = this.decode(cursorString);
    return Cursor.fromBeforeString(id, orderBy);
  }

  public createCursorFromAfterString(cursorString: string): Cursor {
    const { orderBy, id } = this.decode(cursorString);
    return Cursor.fromAfterString(id, orderBy);
  }

  public encode(cursor: Cursor): string {
    // If orderBy and id are the same, or if there's no orderBy,
    // just return the id encoded
    if (!cursor.orderBy || cursor.orderBy === cursor.id) {
      return this.base64Encode(cursor.id);
    }

    // If orderBy and id are different, encode them with the separator
    const fields = [this.encodeOrderBy(cursor.orderBy), cursor.id];

    return this.base64Encode(fields.join(CursorService.SEPARATOR));
  }

  public decode(cursorString: string): {
    orderBy?: CursorOrderType;
    id: string;
  } {
    try {
      const decoded = this.base64Decode(cursorString);

      // If there's no separator, treat the whole string as the id
      if (!decoded.includes(CursorService.SEPARATOR)) {
        return { id: decoded };
      }

      const [orderBy, id] = decoded.split(CursorService.SEPARATOR);
      return {
        orderBy: this.decodeOrderBy(orderBy),
        id,
      };
    } catch (error) {
      throw new Error(
        `Failed to decode cursor ${cursorString} - error: ${error.message}`,
      );
    }
  }

  private base64Encode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64');
  }

  private base64Decode(value: string): string {
    return Buffer.from(value, 'base64').toString('utf8');
  }

  private encodeOrderBy(orderBy: CursorOrderType): string {
    if (orderBy instanceof Date) {
      return `${CursorFieldFormat.DATE}:${orderBy.getTime().toString()}`;
    }
    return `${CursorFieldFormat.STRING}:${orderBy.toString()}`;
  }

  private decodeOrderBy(orderBy: string): CursorOrderType | undefined {
    if (orderBy.startsWith(CursorFieldFormat.DATE + ':')) {
      return new Date(Number.parseInt(orderBy.split(':')[1], 10));
    } else if (orderBy.startsWith(CursorFieldFormat.STRING + ':')) {
      return orderBy.split(':').at(-1);
    }
    return undefined;
  }
}
