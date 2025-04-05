import { Module } from '@nestjs/common';
import { PaginationFactory } from './factories/pagination.factory';
import { CursorService } from './services/cursor.service';
import { PaginationService } from './services/pagination.service';
import { QueryService } from './services/query.service';

@Module({
  providers: [
    PaginationService,
    QueryService,
    CursorService,
    PaginationFactory,
  ],
  exports: [
    PaginationService, // todo: export only PaginationFactory
    PaginationFactory,
  ],
})
export class PaginationModule {}
