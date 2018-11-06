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
  extendSchema,
  isObjectType
} from "graphql";
import { isNode, isDocumentNode } from "./utilities/graphql";
import { GraphQLResolverMap } from "./schema/resolverMap";

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

    for (const module of modules) {
      if (!module.resolvers) continue;

      addResolversToSchema(schema, module.resolvers);
    }

    return { schema };
  } catch (error) {
    return { errors: [error] };
  }
}

function addResolversToSchema(
  schema: GraphQLSchema,
  resolvers: GraphQLResolverMap<any>
) {
  for (const [typeName, fieldConfigs] of Object.entries(resolvers)) {
    const type = schema.getType(typeName);
    if (!isObjectType(type)) continue;

    const fieldMap = type.getFields();

    for (const [fieldName, fieldConfig] of Object.entries(fieldConfigs)) {
      if (fieldName.startsWith("__")) {
        (type as any)[fieldName.substring(2)] = fieldConfig;
        continue;
      }

      const field = fieldMap[fieldName];
      if (!field) continue;

      if (typeof fieldConfig === "function") {
        field.resolve = fieldConfig;
      } else {
        field.resolve = fieldConfig.resolve;
      }
    }
  }
}
