import { FieldNode, TypeNode, Kind } from "graphql";
import { Translatable, Translator } from "../Translators";
import { TypelessObjectDefinition } from "./Objects";
import { SELECTION_OFFSET } from "./utils";

export const TypeKinds = {
  NamedType: "NAMED_TYPE",
  NonNullType: "NON_NULL_TYPE",
  ListType: "LIST_TYPE"
};
export type TypeDefinition = NamedType | NonNullType | ListType;

export function isNamedType(t: TypeDefinition): t is NamedType {
  return t.type === TypeKinds.NamedType;
}
export class NamedType {
  type = TypeKinds.NamedType;
  constructor(public name: string) {}

  public translate(translator: Translator, nullable: boolean = true) {
    return translator.translateNamedType(this, nullable);
  }
}

export function isNonNullType(t: TypeDefinition): t is NonNullType {
  return t.type === TypeKinds.NonNullType;
}
export class NonNullType {
  type = TypeKinds.NonNullType;
  constructor(public base: TypeDefinition) {}

  public translate(translator: Translator) {
    return translator.translateNonNullType(this);
  }
}

export function isListType(t: TypeDefinition): t is ListType {
  return t.type === TypeKinds.ListType;
}
export class ListType {
  type = TypeKinds.ListType;
  constructor(public base: TypeDefinition) {}

  public translate(translator: Translator, nullable: boolean = true) {
    return translator.translateListType(this, nullable);
  }
}

export const findRootType = (t: TypeDefinition): string => {
  if (isNamedType(t)) return t.name;
  return findRootType(t.base);
};

export class CompoundType implements Translatable {
  public types: Array<{
    /** the field name */
    name: string;
    /** the type of the field */
    type: Translatable;
    /** the object the field is a member of */
    baseType: TypelessObjectDefinition;
  }>;

  constructor(
    fields: readonly FieldNode[],
    baseType: TypelessObjectDefinition,
    types: TypelessObjectDefinition[],
    errorLocationIndex: number,
    errors: string[]
  ) {
    this.types = [];

    fields.forEach(node => {
      const field = baseType.fields.find(
        field => field.name === node.name.value
      );

      const startLoc = node.loc!.start - SELECTION_OFFSET + errorLocationIndex;
      const endLoc = node.loc!.end - SELECTION_OFFSET + errorLocationIndex;
      const adjustedErrorLocation = [startLoc, endLoc];
      if (!field) {
        errors.push(
          `(${adjustedErrorLocation}) Could not find field "${node.name.value}" on type "${baseType.name}".`
        );
        return;
      }

      if (node.selectionSet) {
        const newBaseType = types.find(
          type => type.name === findRootType(field.type)
        );

        if (!newBaseType) {
          errors.push(
            `(${adjustedErrorLocation}) Could not find definition for type "${findRootType(
              field.type
            )}" referenced in FieldSet.`
          );
          return;
        }

        this.types.push({
          name: node.name.value,
          type: new CompoundType(
            node.selectionSet.selections as FieldNode[],
            newBaseType,
            types,
            errorLocationIndex,
            errors
          ),
          baseType
        });
      } else {
        this.types.push({
          name: node.name.value,
          type: field.type,
          baseType
        });
      }
    });
  }

  public translate(translator: Translator) {
    return translator.translateCompoundType(this);
  }
}

export const makeType = (sdlVal: TypeNode): TypeDefinition => {
  switch (sdlVal.kind) {
    case Kind.NAMED_TYPE:
      return new NamedType(sdlVal.name.value);
    case Kind.LIST_TYPE:
      return new ListType(makeType(sdlVal.type));
    case Kind.NON_NULL_TYPE:
      return new NonNullType(makeType(sdlVal.type));
  }
};
