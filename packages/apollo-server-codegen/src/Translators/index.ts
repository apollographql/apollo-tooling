import * as IR from "../IR";

export interface InternalTranslatorOptions {
  __experimentalInternalEnumValueSupport: boolean;
}

export type TranslatorOptions = Partial<InternalTranslatorOptions>;

// Each language Translator provides mechanisms for translating each IR component
export abstract class Translator {
  public options: InternalTranslatorOptions;
  constructor(options: TranslatorOptions) {
    const defaultOptions = {
      __experimentalInternalEnumValueSupport: false
    };
    this.options = { ...defaultOptions, ...options };
  }

  /**
   * Build the full type declaration here! Call the #.translate function of each member with `this`
   * to recursively descend into the rest of the methods.
   */
  public abstract generate(
    objects: IR.ObjectDefinition[],
    enums: IR.EnumDefinition[],
    scalars: IR.ScalarDefinition[]
  ): string;

  /**
   * Build a (hopefully IDE-parsable) representation of a field, class, or argument's docstring.
   */
  public abstract translateDescription(d: IR.Description): string;

  /**
   * Translate a basic type. `nullable` is passed for cases when the target language is non-null by default, as
   * GraphQL is nullable by default, so some nullability information must come from above.
   */
  public abstract translateNamedType(
    t: IR.NamedType,
    nullable: boolean
  ): string;
  /**
   * Translate a nonnullable type, it can be helpful to simply call `t.base.translate(this, false)`, in cases where
   * the target language is non-null by default.
   */
  public abstract translateNonNullType(t: IR.NonNullType): string;
  /**
   * Translate an object type such as {id: number, name: string}. These show up in argument descriptions,
   * and some federation features, such as `@provide`'d data and entity representations
   */
  public abstract translateCompoundType(t: IR.CompoundType): string;
  /**
   * Translate a list type, in cases where the target language is non-null by default be sure to check `nullable`.
   */
  public abstract translateListType(t: IR.ListType, nullable: boolean): string;
  /**
   * Translate an input argument definition. These can have descriptions, so make sure you include them!
   */
  public abstract translateArgumentDefinition(t: IR.ArgumentDefinition): string;
  /**
   * Translate the type definition for the resolver of a field
   */
  public abstract translateResolverDefinition(t: IR.ResolverDefinition): string;
  /**
   * Translate an object's field. Be sure to translate the description!
   */
  public abstract translateFieldDefinition(t: IR.FieldDefinition): string;
  /**
   * Translate an entity (federated object). `__resolveReferences` and `Representation` definitions go here!
   */
  public abstract translateEntityDefinition(t: IR.ObjectDefinition): string;
  /**
   * Translate a simple (non-federated) object.
   */
  public abstract translateObjectDefinition(t: IR.ObjectDefinition): string;
  /**
   * Translate an enum
   */
  public abstract translateEnumDefinition(t: IR.EnumDefinition): string;
  /**
   * Translate a scalar type
   */
  public abstract translateScalarDefinition(t: IR.ScalarDefinition): string;
}

// All IR components are Translatable
export interface Translatable {
  translate(t: Translator): string | undefined;
}

// Helper for indenting while translating and one or many Translatable's
export const translateAndIndent = (
  v: Translatable | Translatable[],
  t: Translator
) =>
  "  " +
  (Array.isArray(v)
    ? v
        .map(v => v.translate(t))
        .filter(t => t !== undefined)
        .join("\n")
    : v.translate(t) || ""
  )
    .split("\n")
    .join("\n" + "  ");

import { TypeScriptTranslator } from "./TypeScriptTranslator";
export { TypeScriptTranslator };
