import { PaginationFactory } from '../factories/pagination.factory';
import { Inject } from '@nestjs/common';
import { ObjectLiteral } from 'typeorm';

export const PAGINATION_SERVICE_TOKEN = 'PAGINATION_SERVICE';

// Parameter decorator factory
export const InjectPaginationService = () => Inject(PAGINATION_SERVICE_TOKEN);

// Custom provider factory
export const createPaginationServiceProvider = <
  Entity extends ObjectLiteral,
>() => ({
  provide: PAGINATION_SERVICE_TOKEN,
  useFactory: (paginationFactory: PaginationFactory) => {
    return paginationFactory.create<Entity>();
  },
  inject: [PaginationFactory],
});
