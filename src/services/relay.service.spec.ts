import { RelayPaginationArgs } from '../args/relay-paginated.args';
import { CursorFields } from '../entities/cursor-fields.entity';
import { PaginationResult } from '../entities/pagination-result.entity';
import { Test, TestingModule } from '@nestjs/testing';
import { CursorService } from './cursor.service';
import { RelayService } from './relay.service';

type FakeNode = {
  id: string;
  created_at: Date;
};

describe('RelayService', () => {
  let relayService: RelayService<FakeNode>;
  let cursorFields: CursorFields<FakeNode>;
  let args: Partial<RelayPaginationArgs<FakeNode>>;

  beforeEach(async () => {
    const moduleReference: TestingModule = await Test.createTestingModule({
      providers: [
        CursorService,
        {
          provide: RelayService,
          useFactory: (cursorService: CursorService) => {
            cursorFields = new CursorFields<FakeNode>('id', 'created_at');
            args = {};
            return new RelayService<FakeNode>({
              cursorFields,
              args,
              cursorService,
            });
          },
          inject: [CursorService],
        },
      ],
    }).compile();

    relayService = moduleReference.get<RelayService<FakeNode>>(RelayService);
  });

  it('should be defined', () => {
    expect(relayService).toBeDefined();
  });

  describe('setInstances', () => {
    it('should set instances correctly', () => {
      const instances: FakeNode[] = [
        { id: '1', created_at: new Date('2023-01-01T00:00:00Z') },
        { id: '2', created_at: new Date('2023-01-02T00:00:00Z') },
      ];
      relayService.setInstances(instances);
      expect(relayService['instances']).toEqual(instances);
    });
  });

  describe('setCounts', () => {
    it('should set counts correctly', () => {
      relayService.setCounts(10, 5);
      expect(relayService['counts']).toEqual({
        currentCount: 10,
        previousCount: 5,
      });
    });
  });

  describe('buildPaginationResult', () => {
    it('should build PaginationResult', () => {
      const instances: FakeNode[] = [
        { id: '1', created_at: new Date('2023-01-01T00:00:00Z') },
        { id: '2', created_at: new Date('2023-01-02T00:00:00Z') },
      ];
      relayService.setInstances(instances);
      relayService.setCounts(2, 0);

      const paginationResult = relayService.buildPaginationResult();
      expect(paginationResult).toBeInstanceOf(PaginationResult);
      expect(paginationResult.edges.length).toBe(2);
    });

    it('should reverse instances when hasLast is true', () => {
      const instances: FakeNode[] = [
        { id: '1', created_at: new Date('2023-01-01T00:00:00Z') },
        { id: '2', created_at: new Date('2023-01-02T00:00:00Z') },
        { id: '3', created_at: new Date('2023-01-03T00:00:00Z') },
      ];
      relayService.setInstances(instances);
      relayService.setCounts(3, 0);

      // @ts-expect-error hasLast is private
      relayService['arguments'].hasLast = true;

      const paginationResult = relayService.buildPaginationResult();
      expect(paginationResult.edges[0].node.id).toBe('3');
      expect(paginationResult.edges[1].node.id).toBe('2');
      expect(paginationResult.edges[2].node.id).toBe('1');
    });

    it('should not reverse instances when hasLast is false', () => {
      const instances: FakeNode[] = [
        { id: '1', created_at: new Date('2023-01-01T00:00:00Z') },
        { id: '2', created_at: new Date('2023-01-02T00:00:00Z') },
        { id: '3', created_at: new Date('2023-01-03T00:00:00Z') },
      ];
      relayService.setInstances(instances);
      relayService.setCounts(3, 0);

      // @ts-expect-error hasLast is private
      relayService['arguments'].hasLast = false;

      const paginationResult = relayService.buildPaginationResult();
      expect(paginationResult.edges[0].node.id).toBe('1');
      expect(paginationResult.edges[1].node.id).toBe('2');
      expect(paginationResult.edges[2].node.id).toBe('3');
    });

    it('should handle empty instances', () => {
      relayService.setInstances([]);
      relayService.setCounts(0, 0);

      const paginationResult = relayService.buildPaginationResult();
      expect(paginationResult.edges.length).toBe(0);
    });

    it('should handle default instances if setInstances is not called', () => {
      relayService.setCounts(0, 0);

      const paginationResult = relayService.buildPaginationResult();
      expect(paginationResult.edges.length).toBe(0);
    });
  });
});
