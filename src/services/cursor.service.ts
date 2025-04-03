import {
  Cursor,
  CursorFieldFormat,
  CursorOrderType,
} from 'src/entities/cursor.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CursorService {
  public static SEPARATOR = '<@@>';

  /**
   * @deprecated Use decode directly. Creates Cursor object, may not be needed.
   */
  public createCursorFromBeforeString(cursorString: string): Cursor {
    const { orderBy, id } = this.decode(cursorString);
    return Cursor.fromBeforeString(id, orderBy);
  }

  /**
   * @deprecated Use decode directly. Creates Cursor object, may not be needed.
   */
  public createCursorFromAfterString(cursorString: string): Cursor {
    const { orderBy, id } = this.decode(cursorString);
    return Cursor.fromAfterString(id, orderBy);
  }

  /**
   * Encodes a Cursor object into a base64 string.
   * @deprecated Prefer encodeFromParts for clarity in adapter logic.
   */
  public encode(cursor: Cursor): string {
    // If orderBy and id are the same, or if there's no orderBy,
    // just return the id encoded
    if (
      !cursor.orderBy ||
      cursor.orderBy === cursor.id ||
      cursor.orderBy === undefined
    ) {
      return this.encodeId(cursor.id);
    }

    // If orderBy and id are different, encode them with the separator
    const fields = [
      this.encodeOrderByValue(cursor.orderBy),
      cursor.id, // Use the internal _id
    ];

    return this.base64Encode(fields.join(CursorService.SEPARATOR));
  }

  /**
   * Encodes cursor components (ID and optional order-by value) into a base64 string.
   * This is the preferred method for adapters.
   */
  public encodeFromParts(idValue: any, orderByValue?: any): string {
    const idString = String(idValue); // Ensure ID is a string

    if (
      orderByValue === undefined ||
      orderByValue === null ||
      String(orderByValue) === idString
    ) {
      // Encode only ID if orderByValue is missing, null, undefined, or same as ID
      return this.encodeId(idString);
    }

    // Encode both with separator
    const fields = [this.encodeOrderByValue(orderByValue), idString];
    return this.base64Encode(fields.join(CursorService.SEPARATOR));
  }

  /**
   * Encodes only an ID value to base64.
   */
  public encodeId(idValue: any): string {
    return this.base64Encode(String(idValue));
  }

  /**
   * Decodes a base64 cursor string into its components.
   */
  public decode(cursorString: string): {
    orderBy?: CursorOrderType;
    id: string;
  } {
    try {
      const decoded = this.base64Decode(cursorString);
      return this.decodeParts(decoded);
    } catch (error: any) {
      throw new Error(
        `Failed to decode cursor ${cursorString} - error: ${error.message}`,
      );
    }
  }

  // --- Private Helpers ---

  private base64Encode(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url'); // Use base64url for safety
  }

  private base64Decode(value: string): string {
    return Buffer.from(value, 'base64url').toString('utf8'); // Use base64url
  }

  /** Encodes an order-by value with its type prefix */
  private encodeOrderByValue(orderBy: CursorOrderType): string {
    if (orderBy instanceof Date) {
      return `${CursorFieldFormat.DATE}:${orderBy.getTime().toString()}`;
    }
    if (typeof orderBy === 'number') {
      return `${CursorFieldFormat.NUMBER}:${orderBy.toString()}`;
    }
    // Default to string
    return `${CursorFieldFormat.STRING}:${String(orderBy)}`;
  }

  /** Decodes an order-by value with its type prefix */
  // eslint-disable-next-line max-lines-per-function
  private decodeOrderByValue(
    orderByValueString: string,
  ): CursorOrderType | undefined {
    const separatorIndex = orderByValueString.indexOf(':');
    if (separatorIndex === -1) return undefined; // Invalid format

    const type = orderByValueString.slice(0, Math.max(0, separatorIndex));
    const value = orderByValueString.slice(Math.max(0, separatorIndex + 1));

    if (type === CursorFieldFormat.DATE) {
      // Return as Date object or ISO string? Adapter needs consistency.
      // Let's return ISO string for now, TypeORM/MikroORM handle it.
      const timestamp = Number.parseInt(value, 10);
      return Number.isNaN(timestamp)
        ? undefined
        : new Date(timestamp).toISOString();
    }
    if (type === CursorFieldFormat.NUMBER) {
      const number_ = Number.parseFloat(value);
      return Number.isNaN(number_) ? undefined : number_;
    }
    if (type === CursorFieldFormat.STRING) {
      return value;
    }

    return undefined; // Unknown type
  }

  /**
   * Internal logic to parse the decoded string into parts.
   */
  private decodeParts(decodedString: string): {
    orderBy?: CursorOrderType;
    id: string;
  } {
    // If there's no separator, treat the whole string as the id
    if (!decodedString.includes(CursorService.SEPARATOR)) {
      return { id: decodedString };
    }

    // Split carefully, handling cases where separator might be in the data
    const separatorIndex = decodedString.indexOf(CursorService.SEPARATOR);
    if (separatorIndex === -1) {
      // Should be caught above, but belt-and-suspenders
      return { id: decodedString };
    }

    const orderByPart = decodedString.slice(0, Math.max(0, separatorIndex));
    const idPart = decodedString.slice(
      Math.max(0, separatorIndex + CursorService.SEPARATOR.length),
    );

    return {
      orderBy: this.decodeOrderByValue(orderByPart),
      id: idPart,
    };
  }
}
