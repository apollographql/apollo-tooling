import { GraphQLSchemaModule } from ".";
import {
  GraphQLSchema,
  TypeDefinitionNode,
  isTypeDefinitionNode,
  TypeExtensionNode,
  isTypeExtensionNode,
  GraphQLError,
  buildASTSchema,
  Kind,
  extendSchema
} from "graphql";
import { isNode, isDocumentNode } from "./utilities/graphql";

interface GraphQLServiceDefinition {
  schema?: GraphQLSchema;
  errors?: GraphQLError[];
}

export function buildServiceDefinition(
  modules: GraphQLSchemaModule[]
): GraphQLServiceDefinition {
  const errors: GraphQLError[] = [];

  const typeDefinitionsMap: {
    [name: string]: TypeDefinitionNode[];
  } = Object.create(null);

  const typeExtensionsMap: {
    [name: string]: TypeExtensionNode[];
  } = Object.create(null);

  for (let module of modules) {
    if (isNode(module) && isDocumentNode(module)) {
      module = { typeDefs: module };
    }
    for (const definition of module.typeDefs.definitions) {
      if (isTypeDefinitionNode(definition)) {
        const typeName = definition.name.value;

        if (typeDefinitionsMap[typeName]) {
          typeDefinitionsMap[typeName].push(definition);
        } else {
          typeDefinitionsMap[typeName] = [definition];
        }
      } else if (isTypeExtensionNode(definition)) {
        const typeName = definition.name.value;

        if (typeExtensionsMap[typeName]) {
          typeExtensionsMap[typeName].push(definition);
        } else {
          typeExtensionsMap[typeName] = [definition];
        }
      }
    }
  }

  for (const [typeName, typeDefs] of Object.entries(typeDefinitionsMap)) {
    if (typeDefs.length > 1) {
      errors.push(
        new GraphQLError(
          `Type "${typeName}" was defined more than once.`,
          typeDefs
        )
      );
    }
  }

  if (errors.length > 0) {
    return { errors };
  }

  try {
    const typeDefinitions = Object.values(typeDefinitionsMap).flat();

    let schema = buildASTSchema({
      kind: Kind.DOCUMENT,
      definitions: typeDefinitions
    });

    const typeExtensions = Object.values(typeExtensionsMap).flat();

    if (typeExtensions.length > 0) {
      schema = extendSchema(schema, {
        kind: Kind.DOCUMENT,
        definitions: typeExtensions
      });
    }

    return { schema };
  } catch (error) {
    return { errors: [error] };
  }
}
