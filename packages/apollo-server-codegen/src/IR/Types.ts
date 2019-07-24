import { FieldNode, TypeNode } from "graphql";
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
  public types: Array<{ name: string; type: Translatable }>;

  constructor(
    fields: readonly FieldNode[],
    base: TypelessObjectDefinition,
    types: TypelessObjectDefinition[]
  ) {
    this.types = [];
    fields.forEach(node => {
      const field = base.fields.find(field => field.name === node.name.value);

      if (!field) {
        throw Error(
          `Could not find field "${node.name.value}" on type "${base.name}".`
        );
      }
      const fieldType = field.type;

      if (node.selectionSet) {
        const baseType = types.find(
          type => type.name === findRootType(fieldType)
        );
        if (!baseType) {
          throw Error(
            `Could not find definition for type "${findRootType(
              fieldType
            )}" referenced in schema.`
          );
        }
        this.types.push({
          name: node.name.value,
          type: new CompoundType(
            node.selectionSet.selections as FieldNode[],
            baseType,
            types
          )
        });
      } else {
        this.types.push({
          name: node.name.value,
          type: fieldType
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
    case "NamedType":
      return new NamedType(sdlVal.name.value);
    case "ListType":
      return new ListType(makeType(sdlVal.type));
    case "NonNullType":
      return new NonNullType(makeType(sdlVal.type));
  }
};
