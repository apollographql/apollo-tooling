import { DocumentNode, Kind } from "graphql";
import { EnumDefinition } from "./Enums";
import {
  FieldDefinition,
  ObjectDefinition,
  TypelessObjectDefinition
} from "./Objects";
import { ScalarDefinition } from "./Scalars";
import { UnionDefinition } from "./Unions";
import { InputObjectDefinition } from "./InputObjects";

/**
 * Given SDL as a Document Node, create IR nodes for all it's top-level definitions
 *
 * @param errors Build errors will be pushed to this array in order to report all errors at once versus throwing on the first one.
 */
export function sdlToIR(
  sdl: DocumentNode,
  errors: string[]
): {
  topLevelDefinitions: [
    ObjectDefinition[],
    EnumDefinition[],
    ScalarDefinition[],
    UnionDefinition[],
    InputObjectDefinition[]
  ];
  operationNames: Record<string, string>;
} {
  const typelessObjectDefinitions: TypelessObjectDefinition[] = [];
  const enumDefinitions = [];
  const scalarDefinitions = [];
  const unionDefinitions = [];
  const inputObjectDefinitions = [];

  const operationNames = {
    query: "Query",
    mutation: "Mutation",
    subscription: "Subscription"
  };

  // Start by determining the root types, by checking each root level node if it is a SCHEMA_DEFINITION
  for (const definition of sdl.definitions) {
    if (definition.kind === Kind.SCHEMA_DEFINITION) {
      definition.operationTypes.forEach(opType => {
        operationNames[opType.operation] = opType.type.name.value;
      });
    }
  }

  // Next, collect all the `typeless` IR objects, to for the typemap for later hydration
  for (const definition of sdl.definitions) {
    switch (definition.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.OBJECT_TYPE_EXTENSION:
      case Kind.INTERFACE_TYPE_DEFINITION:
        typelessObjectDefinitions.push(
          new TypelessObjectDefinition(
            definition,
            Object.values(operationNames)
          )
        );
        break;
      case Kind.SCALAR_TYPE_DEFINITION:
        scalarDefinitions.push(new ScalarDefinition(definition));
        break;
      case Kind.ENUM_TYPE_DEFINITION:
        enumDefinitions.push(new EnumDefinition(definition));
        break;
      case Kind.UNION_TYPE_DEFINITION:
        unionDefinitions.push(new UnionDefinition(definition));
        break;
      case Kind.INPUT_OBJECT_TYPE_DEFINITION:
        inputObjectDefinitions.push(new InputObjectDefinition(definition));
        break;
      case Kind.SCHEMA_DEFINITION:
        // handled above
        break;
      default:
        console.warn(
          `Ignoring value of type ${definition.kind}: ${JSON.stringify(
            definition
          )}`
        );
    }
  }

  // now, extract farious federation-specific features:
  const providedFields = typelessObjectDefinitions
    .flatMap(def => def.resolvers)
    .flatMap(resolver =>
      resolver.getProvides(typelessObjectDefinitions, errors)
    );

  const keyFields = typelessObjectDefinitions.flatMap(object =>
    object.getKeys(typelessObjectDefinitions, errors)
  );

  // `provided` fields and `key` fields may be resolved even when @external
  const resolveableExternals = [...providedFields, ...keyFields];

  const typedObjectDefinitions = typelessObjectDefinitions.map(
    typelessDefinition =>
      typelessDefinition.applyGlobalTypeKnowledge(
        typelessObjectDefinitions,
        // filter for all the resolveableExternals on this object
        resolveableExternals
          .filter(provided => provided.objectName === typelessDefinition.name)
          .map(({ fieldName }) => fieldName),
        errors
      )
  );

  return {
    topLevelDefinitions: [
      typedObjectDefinitions,
      enumDefinitions,
      scalarDefinitions,
      unionDefinitions,
      inputObjectDefinitions
    ],
    operationNames
  };
}

export { Description } from "./Descriptions";
export { ArgumentDefinition, ResolverDefinition } from "./Resolvers";
export { CompoundType, ListType, NamedType, NonNullType } from "./Types";
export {
  FieldDefinition,
  ObjectDefinition,
  EnumDefinition,
  ScalarDefinition,
  UnionDefinition,
  InputObjectDefinition
};
