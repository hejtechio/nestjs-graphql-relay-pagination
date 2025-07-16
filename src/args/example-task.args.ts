import { ArgsType, Field, registerEnumType } from '@nestjs/graphql';
import { IsEnum, IsOptional } from 'class-validator';
import { RelayPaginationArgs } from './relay-paginated.args';

/**
 * Example enum for task ordering fields.
 * Define the fields that are safe and meaningful to order by.
 */
export enum TaskOrderField {
  CREATED_AT = 'createdAt',
  NAME = 'name',
  STATUS = 'status',
  PRIORITY = 'priority',
}

/**
 * Example enum for order direction.
 */
export enum OrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

// Register enums with GraphQL
registerEnumType(TaskOrderField, {
  name: 'TaskOrderField',
  description: 'Fields available for ordering tasks',
});

registerEnumType(OrderDirection, {
  name: 'OrderDirection',
  description: 'Order direction for sorting',
});

/**
 * Input type for ordering specification.
 */
export class TaskOrderBy {
  @Field(() => TaskOrderField)
  @IsEnum(TaskOrderField)
  field: TaskOrderField;

  @Field(() => OrderDirection, { defaultValue: OrderDirection.DESC })
  @IsEnum(OrderDirection)
  @IsOptional()
  direction: OrderDirection = OrderDirection.DESC;
}

/**
 * Example: Entity-specific args class extending RelayPaginationArgs.
 *
 * This demonstrates the recommended pattern for adding ordering to specific entities
 * while maintaining type safety and separation of concerns.
 *
 * Usage in resolver:
 * ```typescript
 * @Query(() => TaskConnection)
 * async tasks(@Args() args: TaskArgs): Promise<TaskConnection> {
 *   const queryBuilder = this.taskRepository.createQueryBuilder('task');
 *
 *   // Apply ordering if specified
 *   if (args.orderBy) {
 *     queryBuilder.orderBy(`task.${args.orderBy.field}`, args.orderBy.direction);
 *   }
 *
 *   // The pagination service will detect the ordering automatically
 *   return this.paginationService.paginate(queryBuilder, args);
 * }
 * ```
 */
@ArgsType()
export class TaskArgs extends RelayPaginationArgs {
  @Field(() => TaskOrderBy, {
    nullable: true,
    description:
      'Ordering specification for tasks. If not provided, defaults to createdAt DESC.',
  })
  @IsOptional()
  orderBy?: TaskOrderBy;
}
