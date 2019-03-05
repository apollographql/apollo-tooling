import { DocumentNode, GraphQLSchema, GraphQLError } from "graphql";

import { SDLValidationRule } from "graphql/validation/ValidationContext";

// FIXME: These typings should all be added to `@types/graphql`.

declare module "graphql/validation/validate" {
  function validateSDL(
    documentAST: DocumentNode,
    schemaToExtend?: GraphQLSchema | null,
    rules?: ReadonlyArray<SDLValidationRule>
  ): GraphQLError[];
}

declare module "graphql/type/schema" {
  interface GraphQLSchema {
    toConfig(): GraphQLSchemaConfig;
  }
}

declare module "graphql/type/definition" {
  interface GraphQLObjectType {
    toConfig(): GraphQLObjectTypeConfig<any, any> & {
      interfaces: GraphQLInterfaceType[];
      fields: GraphQLFieldConfigMap<any, any>;
    };
  }

  interface GraphQLInterfaceType {
    toConfig(): GraphQLInterfaceTypeConfig<any, any> & {
      fields: GraphQLFieldConfigMap<any, any>;
    };
  }

  interface GraphQLUnionType {
    toConfig(): GraphQLUnionTypeConfig<any, any> & {
      types: GraphQLObjectType[];
    };
  }

  interface GraphQLInputObjectType {
    toConfig(): GraphQLInputObjectTypeConfig & {
      fields: GraphQLInputFieldConfigMap;
    };
  }

  interface GraphQLField<TSource, TContext, TArgs = { [key: string]: any }> {
    toConfig(): GraphQLFieldConfig<TSource, TContext, TArgs>;
  }
}
