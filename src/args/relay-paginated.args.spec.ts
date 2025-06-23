import { RelayPaginationArgs } from './relay-paginated.args';
import { QueryOrderEnum } from '../enums/query-order.enum';
import { DEFAULT_LIMIT } from '../util/consts';

describe('RelayPaginationArgs', () => {
  describe('create factory method', () => {
    it('should create instance with default values when no options provided', () => {
      const args = RelayPaginationArgs.create();

      expect(args.first).toBe(DEFAULT_LIMIT);
      expect(args.last).toBeUndefined();
      expect(args.order).toBe(QueryOrderEnum.DESC);
      expect(args.after).toBeUndefined();
      expect(args.before).toBeUndefined();
      expect(args.orderBy).toBeUndefined();
    });

    it('should apply provided options correctly', () => {
      const args = RelayPaginationArgs.create({
        first: 5,
        order: QueryOrderEnum.ASC,
        after: 'cursor123',
        orderBy: 'createdAt',
      });

      expect(args.first).toBe(5);
      expect(args.order).toBe(QueryOrderEnum.ASC);
      expect(args.after).toBe('cursor123');
      expect(args.orderBy).toBe('createdAt');
    });

    it('should not set first when last is provided', () => {
      const args = RelayPaginationArgs.create({
        last: 5,
        order: QueryOrderEnum.ASC,
      });

      expect(args.first).toBeUndefined();
      expect(args.last).toBe(5);
    });

    it('should handle objects with computed getter properties without throwing errors', () => {
      const optionsWithGetters = {
        first: 10,
        order: QueryOrderEnum.ASC,
        hasCursor: true, // ❌ Would cause "Cannot set property" error
        hasFirst: true,
        hasLast: false,
      };

      // This should NOT throw an error
      expect(() => {
        const args = RelayPaginationArgs.create(optionsWithGetters as any);
        expect(args.first).toBe(10);
        expect(args.order).toBe(QueryOrderEnum.ASC);
      }).not.toThrow();
    });

    it('should ignore computed properties and calculate them from actual values', () => {
      const optionsWithGetters = {
        first: 10,
        order: QueryOrderEnum.ASC,
        after: 'cursor123',
        hasCursor: false, // Ignored - actual value true due to 'after'
        hasFirst: false, // Ignored - actual value true due to 'first'
        hasLast: true, // Ignored - actual value false due to no 'last'
      };

      const args = RelayPaginationArgs.create(optionsWithGetters as any);

      // Verify computed properties reflect actual state, not passed values
      expect(args.hasCursor).toBe(true); // true because 'after' is set
      expect(args.hasFirst).toBe(true); // true because 'first' is set
      expect(args.hasLast).toBe(false); // false because 'last' is not set
    });
  });

  describe('computed getters', () => {
    it('should calculate hasCursor correctly', () => {
      const argsWithAfter = RelayPaginationArgs.create({ after: 'cursor123' });
      expect(argsWithAfter.hasCursor).toBe(true);

      const argsWithBefore = RelayPaginationArgs.create({
        before: 'cursor456',
      });
      expect(argsWithBefore.hasCursor).toBe(true);

      const argsWithoutCursor = RelayPaginationArgs.create({ first: 10 });
      expect(argsWithoutCursor.hasCursor).toBe(false);
    });

    it('should calculate hasFirst correctly', () => {
      const argsWithFirst = RelayPaginationArgs.create({ first: 10 });
      expect(argsWithFirst.hasFirst).toBe(true);

      const argsWithoutFirst = RelayPaginationArgs.create({ last: 10 });
      expect(argsWithoutFirst.hasFirst).toBe(false);
    });

    it('should calculate hasLast correctly', () => {
      const argsWithLast = RelayPaginationArgs.create({ last: 10 });
      expect(argsWithLast.hasLast).toBe(true);

      const argsWithoutLast = RelayPaginationArgs.create({ first: 10 });
      expect(argsWithoutLast.hasLast).toBe(false);
    });
  });

  describe('regression test for constructor behavior', () => {
    it('should match the constructor logic for defaults', () => {
      // Test: No first or last should default to first = DEFAULT_LIMIT
      const defaultArgs = RelayPaginationArgs.create();
      expect(defaultArgs.first).toBe(DEFAULT_LIMIT);
      expect(defaultArgs.last).toBeUndefined();

      // Test: With first, should not change it
      const withFirst = RelayPaginationArgs.create({ first: 5 });
      expect(withFirst.first).toBe(5);
      expect(withFirst.last).toBeUndefined();

      // Test: With last, should not add first
      const withLast = RelayPaginationArgs.create({ last: 5 });
      expect(withLast.first).toBeUndefined();
      expect(withLast.last).toBe(5);

      // Test: Default order should be DESC
      const defaultOrder = RelayPaginationArgs.create();
      expect(defaultOrder.order).toBe(QueryOrderEnum.DESC);
    });
  });

  it('should demonstrate that Object.assign with getter properties would fail without filtering', () => {
    const args = new RelayPaginationArgs();
    const badOptions = {
      first: 10,
      hasCursor: true,
      hasFirst: true,
      hasLast: false,
    };

    // This would throw the same error if we didn't filter out getter properties
    expect(() => {
      Object.assign(args, badOptions);
    }).toThrow(/Cannot set property (hasCursor|hasFirst|hasLast)/);
  });
});
