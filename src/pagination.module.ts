import { DynamicModule, Module, Provider, Type } from '@nestjs/common';
import { PaginationAdapter } from './pagination.interfaces';
import { CursorService } from './services/cursor.service';
import { PaginationService } from './services/pagination.service';
import { TypeOrmPaginationAdapter } from './adapters/typeorm-pagination.adapter'; // Default adapter

/**
 * Injection token for the pagination adapter.
 */
export const PAGINATION_ADAPTER = 'PAGINATION_ADAPTER';

/**
 * Options for configuring the PaginationModule.
 */
export interface PaginationModuleOptions {
  /**
   * The pagination adapter class to use.
   * Defaults to TypeOrmPaginationAdapter if not provided.
   */
  adapter?: Type<PaginationAdapter>;
}

@Module({})
export class PaginationModule {
  /**
   * Registers the PaginationModule dynamically with the specified options.
   *
   * @param options Configuration options for the module.
   * @returns A DynamicModule instance.
   */
  // eslint-disable-next-line max-lines-per-function
  static register(options?: PaginationModuleOptions): DynamicModule {
    // Determine which adapter class to use
    const adapterClass = options?.adapter ?? TypeOrmPaginationAdapter;

    // Provider for the adapter class itself (e.g., TypeOrmPaginationAdapter).
    // This ensures NestJS knows how to instantiate it and inject its dependencies (like CursorService).
    const adapterClassProvider: Provider = {
      provide: adapterClass,
      useClass: adapterClass,
    };

    // Provider for the injection token PAGINATION_ADAPTER.
    // It uses a factory that depends on the resolved instance of the adapterClass.
    const adapterTokenProvider: Provider = {
      provide: PAGINATION_ADAPTER,
      useFactory: (adapterInstance: PaginationAdapter) => {
        // The factory simply returns the instance injected via `inject`
        return adapterInstance;
      },
      // Explicitly declare that this factory injects an instance of the resolved adapter class
      inject: [adapterClass],
    };

    return {
      module: PaginationModule,
      providers: [
        CursorService, // Needed by TypeOrmPaginationAdapter (and potentially others)
        adapterClassProvider, // Provide the adapter class itself (e.g., TypeOrmPaginationAdapter)
        adapterTokenProvider, // Provide the token (PAGINATION_ADAPTER) using the factory
        PaginationService, // Provide the main service (depends on PAGINATION_ADAPTER)
      ],
      exports: [PaginationService],
      global: false,
    };
  }
}
