import { DocumentNode } from "graphql";
import { GraphQLFieldResolver, GraphQLResolveInfo } from "graphql";

export interface GraphQLSchemaModule {
  typeDefs: DocumentNode;
  resolvers?: GraphQLResolverMap<any>;
}

export interface GraphQLResolverMap<TContext> {
  [typeName: string]: {
    [fieldName: string]:
      | GraphQLFieldResolver<any, TContext>
      | {
          requires: string;
          resolve: GraphQLFieldResolver<any, TContext>;
        };
  };
}

export type GraphQLObjectResolver<TSource, TContext> = (
  source: TSource,
  context: TContext,
  info: GraphQLResolveInfo
) => any;

declare module "graphql/type/definition" {
  interface GraphQLObjectType {
    resolveObject?: GraphQLObjectResolver<any, any>;
  }

  interface GraphQLObjectTypeConfig<TSource, TContext> {
    resolveObject?: GraphQLObjectResolver<TSource, TContext>;
  }
}
