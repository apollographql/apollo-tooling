import {
  concatAST,
  DocumentNode,
  extendSchema,
  GraphQLSchema,
  isObjectType,
  isTypeDefinitionNode,
  isTypeExtensionNode,
  Kind,
  TypeDefinitionNode,
  TypeExtensionNode,
  DirectiveDefinitionNode,
  SchemaDefinitionNode,
  SchemaExtensionNode,
  OperationTypeNode,
  GraphQLObjectType
} from "graphql";
import { validateSDL } from "graphql/validation/validate";
import { isDocumentNode, isNode } from "../utilities/graphql";
import { GraphQLResolverMap } from "./resolverMap";
import { GraphQLSchemaValidationError } from "./GraphQLSchemaValidationError";
import { specifiedSDLRules } from "graphql/validation/specifiedRules";
import { isNotNullOrUndefined } from "../utilities/predicates";

export interface GraphQLSchemaModule {
  typeDefs: DocumentNode;
  resolvers?: GraphQLResolverMap<any>;
}

const skippedSDLRules = [
  "PossibleTypeExtensions",
  "KnownTypeNames",
  "UniqueDirectivesPerLocation"
];

const sdlRules = specifiedSDLRules.filter(
  rule => !skippedSDLRules.includes(rule.name)
);

export function buildSchemaFromModules(
  modules: GraphQLSchemaModule[],
  schemaToExtend?: GraphQLSchema
): GraphQLSchema {
  modules = modules.map(module => {
    if (isNode(module) && isDocumentNode(module)) {
      return { typeDefs: module };
    } else {
      return module;
    }
  });

  const asts = modules.map(module => module.typeDefs);
  const documentAST = concatAST(asts);

  const schema = buildSchemaFromSDL(documentAST, schemaToExtend);

  for (const module of modules) {
    if (!module.resolvers) continue;
    addResolversToSchema(schema, module.resolvers);
  }

  return schema;
}

export function buildSchemaFromSDL(
  documentAST: DocumentNode,
  schemaToExtend?: GraphQLSchema
): GraphQLSchema {
  const errors = validateSDL(documentAST, schemaToExtend, sdlRules);
  if (errors.length > 0) {
    throw new GraphQLSchemaValidationError(errors);
  }

  const definitionsMap: {
    [name: string]: TypeDefinitionNode[];
  } = Object.create(null);

  const extensionsMap: {
    [name: string]: TypeExtensionNode[];
  } = Object.create(null);

  const directiveDefinitions: DirectiveDefinitionNode[] = [];

  const schemaDefinitions: SchemaDefinitionNode[] = [];
  const schemaExtensions: SchemaExtensionNode[] = [];

  for (const definition of documentAST.definitions) {
    if (isTypeDefinitionNode(definition)) {
      const typeName = definition.name.value;

      if (definitionsMap[typeName]) {
        definitionsMap[typeName].push(definition);
      } else {
        definitionsMap[typeName] = [definition];
      }
    } else if (isTypeExtensionNode(definition)) {
      const typeName = definition.name.value;

      if (extensionsMap[typeName]) {
        extensionsMap[typeName].push(definition);
      } else {
        extensionsMap[typeName] = [definition];
      }
    } else if (definition.kind === Kind.DIRECTIVE_DEFINITION) {
      directiveDefinitions.push(definition);
    } else if (definition.kind === Kind.SCHEMA_DEFINITION) {
      schemaDefinitions.push(definition);
    } else if (definition.kind === Kind.SCHEMA_EXTENSION) {
      schemaExtensions.push(definition);
    }
  }

  let schema = schemaToExtend
    ? schemaToExtend
    : new GraphQLSchema({
        query: undefined
      });

  const missingTypeDefinitions: TypeDefinitionNode[] = [];

  for (const [extendedTypeName, extensions] of Object.entries(extensionsMap)) {
    if (!definitionsMap[extendedTypeName]) {
      const extension = extensions[0];

      const kind = extension.kind;
      const definition = {
        kind: extKindToDefKind[kind],
        name: extension.name
      } as TypeDefinitionNode;

      missingTypeDefinitions.push(definition);
    }
  }

  schema = extendSchema(
    schema,
    {
      kind: Kind.DOCUMENT,
      definitions: [
        ...Object.values(definitionsMap).flat(),
        ...missingTypeDefinitions,
        ...directiveDefinitions
      ]
    },
    {
      assumeValidSDL: true
    }
  );

  schema = extendSchema(
    schema,
    {
      kind: Kind.DOCUMENT,
      definitions: Object.values(extensionsMap).flat()
    },
    {
      assumeValidSDL: true
    }
  );

  let operationTypeMap: { [operation in OperationTypeNode]?: string };

  if (schemaDefinitions.length > 0 || schemaExtensions.length > 0) {
    operationTypeMap = {};

    const operationTypes = [...schemaDefinitions, ...schemaExtensions]
      .map(node => node.operationTypes)
      .filter(isNotNullOrUndefined)
      .flat();

    for (const { operation, type } of operationTypes) {
      operationTypeMap[operation] = type.name.value;
    }
  } else {
    operationTypeMap = {
      query: "Query",
      mutation: "Mutation",
      subscription: "Subscription"
    };
  }

  schema = new GraphQLSchema({
    ...schema.toConfig(),
    query: operationTypeMap.query
      ? (schema.getType(operationTypeMap.query) as GraphQLObjectType<any, any>)
      : undefined
  });

  return schema;
}

const extKindToDefKind = {
  [Kind.SCALAR_TYPE_EXTENSION]: Kind.SCALAR_TYPE_DEFINITION,
  [Kind.OBJECT_TYPE_EXTENSION]: Kind.OBJECT_TYPE_DEFINITION,
  [Kind.INTERFACE_TYPE_EXTENSION]: Kind.INTERFACE_TYPE_DEFINITION,
  [Kind.UNION_TYPE_EXTENSION]: Kind.UNION_TYPE_DEFINITION,
  [Kind.ENUM_TYPE_EXTENSION]: Kind.ENUM_TYPE_DEFINITION,
  [Kind.INPUT_OBJECT_TYPE_EXTENSION]: Kind.INPUT_OBJECT_TYPE_DEFINITION
};

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
