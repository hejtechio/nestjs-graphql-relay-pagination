import {
  RelayPageInfo,
  RelayPaginated,
  RelayPaginatedWithCount,
} from '../interfaces/relay-paginated.interface';
import { Type } from '@nestjs/common';
import { Field, Int, ObjectType } from '@nestjs/graphql';

import { Edge } from '../interfaces/relay-paginated.interface';

export function EdgeObject<Node>(classReference: Type<Node>): Type<Edge<Node>> {
  @ObjectType({ isAbstract: true })
  abstract class EdgeType implements Edge<Node> {
    @Field(() => String)
    public cursor: string;

    @Field(() => classReference)
    public node: Node;
  }

  return EdgeType as Type<Edge<Node>>;
}

@ObjectType('RelayPageInfo')
abstract class PageInfoType implements RelayPageInfo {
  @Field(() => String)
  public startCursor: string;

  @Field(() => String)
  public endCursor: string;

  @Field(() => Boolean)
  public hasNextPage: boolean;

  @Field(() => Boolean)
  public hasPreviousPage: boolean;
}

export function RelayPaginatedResponse<Node>(
  classReference: Type<Node>,
): Type<RelayPaginated<Node>> {
  @ObjectType(`${classReference.name}RelayEdge`)
  abstract class EdgeType extends EdgeObject(classReference) {}

  @ObjectType({ isAbstract: true })
  abstract class RelayPaginatedType implements RelayPaginated<Node> {
    @Field(() => [EdgeType])
    public edges: EdgeType[];

    @Field(() => PageInfoType)
    public pageInfo: PageInfoType;
  }

  return RelayPaginatedType as Type<RelayPaginated<Node>>;
}

export function RelayPaginatedResponseWithCount<Node>(
  classReference: Type<Node>,
): Type<RelayPaginated<Node>> {
  @ObjectType({ isAbstract: true })
  abstract class RelayPaginatedWithCountType extends RelayPaginatedResponse(
    classReference,
  ) {
    @Field(() => Int)
    public totalCount: number;

    @Field(() => Int)
    public previousCount: number;

    @Field(() => Int)
    public currentCount: number;
  }

  return RelayPaginatedWithCountType as Type<RelayPaginatedWithCount<Node>>;
}

export function PaginatedEntity<Node>(classReference: Type<Node>) {
  @ObjectType({ isAbstract: true })
  class PaginatedType extends RelayPaginatedResponse(classReference) {}
  return PaginatedType;
}

export function PaginatedEntityWithCount<Node>(classReference: Type<Node>) {
  @ObjectType(`${classReference.name}RelayPaginated`)
  class PaginatedType extends RelayPaginatedResponseWithCount(classReference) {}
  return PaginatedType;
}
