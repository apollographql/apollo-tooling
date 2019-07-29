import { FieldNode, TypeNode, Kind } from "graphql";
import { Translatable, Translator } from "../Translators";
import { TypelessObjectDefinition } from "./Objects";

export interface TypeDefinition extends Translatable {
  translate(translator: Translator, nullable?: boolean): string;
}

export class NamedType implements TypeDefinition {
  constructor(public name: string) {}

  public translate(translator: Translator, nullable: boolean = true) {
    return translator.translateNamedType(this, nullable);
  }
}

export class NonNullType implements TypeDefinition {
  constructor(public base: TypeDefinition) {}

  public translate(translator: Translator) {
    return translator.translateNonNullType(this);
  }
}

export class ListType implements TypeDefinition {
  constructor(public base: TypeDefinition) {}

  public translate(translator: Translator, nullable: boolean = true) {
    return translator.translateListType(this, nullable);
  }
}

export const findRootType = (t: TypeDefinition): string => {
  if (t instanceof NamedType) return t.name;
  if (t instanceof NonNullType) return findRootType(t.base);
  if (t instanceof ListType) return findRootType(t.base);
  throw new Error("Unreachable?");
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
    types: TypelessObjectDefinition[]
  ) {
    this.types = [];

    fields.forEach(node => {
      const field = baseType.fields.find(
        field => field.name === node.name.value
      );

      if (!field) {
        throw Error(
          `Could not find field "${node.name.value}" on type "${baseType.name}".`
        );
      }

      if (node.selectionSet) {
        const newBaseType = types.find(
          type => type.name === findRootType(field.type)
        );

        if (!newBaseType) {
          throw Error(
            `Could not find definition for type "${findRootType(
              field.type
            )}" referenced in schema.`
          );
        }

        this.types.push({
          name: node.name.value,
          type: new CompoundType(
            node.selectionSet.selections as FieldNode[],
            newBaseType,
            types
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
