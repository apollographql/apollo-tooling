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

  public abstract generateHeader(): string;
  public abstract generateTopLevelResolvers(
    types: string[],
    enums: string[],
    scalars: string[]
  ): string;
  public abstract translateDescription(d: IR.Description): string;
  public abstract translateNamedType(
    t: IR.NamedType,
    nullable: boolean
  ): string;
  public abstract translateNonNullType(t: IR.NonNullType): string;
  public abstract translateCompoundType(t: IR.CompoundType): string;
  public abstract translateListType(t: IR.ListType, nullable: boolean): string;
  public abstract translateArgumentDefinition(t: IR.ArgumentDefinition): string;
  public abstract translateResolverDefinition(t: IR.ResolverDefinition): string;
  public abstract translateFieldDefinition(t: IR.FieldDefinition): string;
  public abstract translateEntityDefinition(t: IR.ObjectDefinition): string;
  public abstract translateObjectDefinition(t: IR.ObjectDefinition): string;
  public abstract translateEnumDefinition(t: IR.EnumDefinition): string;
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
