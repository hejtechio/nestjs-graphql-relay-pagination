import { CursorService } from '../services/cursor.service';
import { PaginationService } from '../services/pagination.service';
import { QueryService } from '../services/query.service';
import { Injectable } from '@nestjs/common';
import { ObjectLiteral } from 'typeorm';

@Injectable()
export class PaginationFactory {
  constructor(private readonly cursorService: CursorService) {}

  create<Node extends ObjectLiteral>(): PaginationService<Node> {
    return new PaginationService(new QueryService<Node>(), this.cursorService);
  }
}
