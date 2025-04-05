import {
  Cursor,
  CursorFieldFormat,
  CursorOrderType,
} from '../entities/cursor.entity';
import { beforeEach, describe, expect, it } from 'vitest';
import { CursorService } from './cursor.service';

// Helper function to create an encoded cursor string
function createEncodedCursor(id: string, orderBy?: CursorOrderType): string {
  const cursorData = orderBy
    ? [
        orderBy instanceof Date
          ? `${CursorFieldFormat.DATE}:${orderBy.getTime()}`
          : `${CursorFieldFormat.STRING}:${orderBy}`,
        id,
      ]
    : [id];

  return Buffer.from(cursorData.join(CursorService.SEPARATOR), 'utf8').toString(
    'base64',
  );
}

describe('CursorService', () => {
  let cursorService: CursorService;

  beforeEach(() => {
    cursorService = new CursorService();
  });

  it('should encode a cursor with only id', () => {
    const cursor = Cursor.fromAfterString('1');
    const encoded = cursorService.encode(cursor);

    expect(encoded).toBeDefined();
    const decodedString = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decodedString).toBe('1');
  });

  it('should encode a cursor with a string orderBy', () => {
    const cursor = Cursor.fromAfterString('1', 'name');
    const encoded = cursorService.encode(cursor);

    expect(encoded).toBeDefined();
    const decodedString = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decodedString).toContain('name');
  });

  it('should encode a cursor with a date orderBy', () => {
    const date = new Date('2024-08-28T13:27:55.450Z');
    const cursor = Cursor.fromAfterString('1', date);
    const encoded = cursorService.encode(cursor);

    expect(encoded).toBeDefined();
    const decodedString = Buffer.from(encoded, 'base64').toString('utf8');
    expect(decodedString).toContain(date.getTime().toString());
  });

  it('should decode a cursor string with only id', () => {
    const encodedString = createEncodedCursor('1');
    const decoded = cursorService.decode(encodedString);

    expect(decoded).toEqual({
      orderBy: undefined,
      id: '1',
    });
  });

  it('should decode a cursor string with a string orderBy', () => {
    const encodedString = createEncodedCursor('1', 'name');
    const decoded = cursorService.decode(encodedString);

    expect(decoded).toEqual({
      orderBy: 'name',
      id: '1',
    });
  });

  it('should decode a cursor string with a date orderBy', () => {
    const date = new Date('2024-08-28T13:27:55.450Z');
    const encodedString = createEncodedCursor('1', date);
    const decoded = cursorService.decode(encodedString);

    expect(decoded.orderBy).toEqual(new Date(date.getTime()).toISOString());
    expect(decoded.id).toBe('1');
  });

  it('should create a cursor from a before string with only id', () => {
    const encodedString = createEncodedCursor('1');
    const cursor = cursorService.createCursorFromBeforeString(encodedString);

    expect(cursor.isBefore).toBe(true);
    expect(cursor.id).toBe('1');
    expect(cursor.orderBy).toBeUndefined();
  });

  it('should create a cursor from an after string with only id', () => {
    const encodedString = createEncodedCursor('1');
    const cursor = cursorService.createCursorFromAfterString(encodedString);

    expect(cursor.isAfter).toBe(true);
    expect(cursor.id).toBe('1');
    expect(cursor.orderBy).toBeUndefined();
  });
});
