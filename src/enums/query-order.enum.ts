import { registerEnumType } from '@nestjs/graphql';

export enum QueryOrderEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

registerEnumType(QueryOrderEnum, {
  name: 'QueryOrder',
});
