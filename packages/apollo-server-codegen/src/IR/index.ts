import { DocumentNode } from "graphql";
import { EnumDefinition } from "./Enums";
import {
  FieldDefinition,
  ObjectDefinition,
  TypelessObjectDefinition
} from "./Objects";
import { ScalarDefinition } from "./Scalars";

export { Description } from "./Descriptions";
export { ArgumentDefinition, ResolverDefinition } from "./Resolvers";
export { CompoundType, ListType, NamedType, NonNullType } from "./Types";
export { FieldDefinition, ObjectDefinition, EnumDefinition, ScalarDefinition };

export function sdlToIR(
  sdl: DocumentNode
): [ObjectDefinition[], EnumDefinition[], ScalarDefinition[]] {
  const objectDefinitions: TypelessObjectDefinition[] = [];
  const enumDefinitions = [];
  const scalarDefinitions = [];
  for (const definition of sdl.definitions) {
    switch (definition.kind) {
      case "ObjectTypeDefinition":
      case "ObjectTypeExtension":
        objectDefinitions.push(new TypelessObjectDefinition(definition));
        break;
      case "ScalarTypeDefinition":
        scalarDefinitions.push(new ScalarDefinition(definition));
        break;
      case "EnumTypeDefinition":
        enumDefinitions.push(new EnumDefinition(definition));
        break;
      default:
        console.log(
          `Ignoring value of type ${definition.kind}: ${JSON.stringify(
            definition
          )}`
        );
    }
  }

  const flatMap = <T, E>(
    array: readonly T[],
    callback: (e: T) => readonly E[]
  ) => ([] as E[]).concat.apply([], array.map(callback));

  const providedFields = flatMap(objectDefinitions, def =>
    flatMap(def.resolvers, resolver => resolver.getProvides())
  );

  return [
    objectDefinitions.map(typeless =>
      typeless.applyGlobalTypeKnowledge(
        objectDefinitions,
        providedFields
          .filter(provided => provided.type === typeless.name)
          .map(({ field }) => field)
      )
    ),
    enumDefinitions,
    scalarDefinitions
  ];
}
