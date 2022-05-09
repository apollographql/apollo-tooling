import { CodeActionInfo } from "../errors/validation";

export interface ClientSchemaInfo {
  localFields?: string[];
}

declare module "graphql" {
  interface GraphQLErrorExtensions {
    codeAction?: CodeActionInfo;
  }

  interface GraphQLScalarTypeExtensions {
    apolloLanguageServer?: {
      clientSchema?: ClientSchemaInfo;
    };
  }

  interface GraphQLObjectTypeExtensions {
    apolloLanguageServer?: {
      clientSchema?: ClientSchemaInfo;
    };
  }

  interface GraphQLInterfaceTypeExtensions {
    apolloLanguageServer?: {
      clientSchema?: ClientSchemaInfo;
    };
  }

  interface GraphQLUnionTypeExtensions {
    apolloLanguageServer?: {
      clientSchema?: ClientSchemaInfo;
    };
  }

  interface GraphQLEnumTypeExtensions {
    apolloLanguageServer?: {
      clientSchema?: ClientSchemaInfo;
    };
  }
}
