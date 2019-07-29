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
import { Translatable } from "../Translators";

export function sdlToIR(
  sdl: DocumentNode
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
  const objectDefinitions: TypelessObjectDefinition[] = [];
  const enumDefinitions = [];
  const scalarDefinitions = [];
  const unionDefinitions = [];
  const inputObjectDefinitions = [];

  const operationNames = {
    query: "Query",
    mutation: "Mutation",
    subscription: "Subscription"
  };

  for (const definition of sdl.definitions) {
    if (definition.kind === Kind.SCHEMA_DEFINITION) {
      definition.operationTypes.forEach(opType => {
        operationNames[opType.operation] = opType.type.name.value;
      });
    }
  }

  for (const definition of sdl.definitions) {
    switch (definition.kind) {
      case Kind.OBJECT_TYPE_DEFINITION:
      case Kind.OBJECT_TYPE_EXTENSION:
      case Kind.INTERFACE_TYPE_DEFINITION:
        objectDefinitions.push(
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

  const providedFields = objectDefinitions
    .flatMap(def => def.resolvers)
    .flatMap(resolver => resolver.getProvides(objectDefinitions));

  return {
    topLevelDefinitions: [
      objectDefinitions.map(typeless =>
        typeless.applyGlobalTypeKnowledge(
          objectDefinitions,
          providedFields
            .filter(provided => provided.objectName === typeless.name)
            .map(({ fieldName }) => fieldName)
        )
      ),
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
