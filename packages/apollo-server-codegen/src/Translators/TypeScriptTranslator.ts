import { translateAndIndent, Translator } from ".";
import * as IR from "../IR";

export class TypeScriptTranslator extends Translator {
  public generateHeader() {
    // Generate some utility higher order types that we'll reference later on.
    return `// This is a machine generated file.
// Use "apollo service:codegen" to regenerate.
type PromiseOrValue<T> = Promise<T> | T
type Nullable<T> = T | null | undefined
type Index<Map extends Record<string, any>, Key extends string, IfMissing> = Map[Key] extends object ? Map[Key] : IfMissing
`;
  }

  public generateTopLevelResolvers(
    types: string[],
    enums: string[],
    scalars: string[]
  ) {
    return [
      `export interface Resolvers<TContext = {}, TInternalReps = {}> {`,
      ...types.map(type =>
        type === "Query"
          ? `  ${type}: ${type}Resolver<TContext, TInternalReps>`
          : `  ${type}?: ${type}Resolver<TContext, TInternalReps>`
      ),
      ...scalars.map(scalar => `  ${scalar}: any`),
      ...(this.options.__experimentalInternalEnumValueSupport
        ? enums.map(
            enumName =>
              `  ${enumName}: { [external: ${enumName}External]: any }`
          )
        : []),
      `}\n`
    ].join("\n");
  }

  public translateDescription(t: IR.Description): string {
    return "/**\n * " + t.description.split("\n").join("\n * ") + "\n */\n";
  }

  public translateNamedType(t: IR.NamedType, nullable: boolean): string {
    const getName = () => {
      switch (t.name) {
        case "Int":
          return "number";
        case "Boolean":
          return "boolean";
        case "ID":
          return "string";
        case "String":
          return "string";
        default:
          return t.name;
      }
    };

    return nullable ? `Nullable<${getName()}>` : getName();
  }

  public translateNonNullType(t: IR.NonNullType): string {
    return t.base.translate(this, false);
  }

  public translateListType(t: IR.ListType, nullable: boolean): string {
    return nullable
      ? `Nullable<Array<${t.base.translate(this)}>>`
      : `Array<${t.base.translate(this)}>`;
  }

  public translateCompoundType(t: IR.CompoundType): string {
    return [
      "{ ",
      ...t.types.map(type => `${type.name}: ${type.type.translate(this)}, `),
      "}"
    ].join("");
  }

  public translateArgumentDefinition(t: IR.ArgumentDefinition): string {
    return [
      t.description.translate(this),
      t.name,
      // Bit of hack here to use optional types instead of Nullable, for better compatibility with
      // destructuring default assignment: ({arg = default}) => ...
      t.type instanceof IR.NonNullType ? `: ` : `?: `,
      new IR.NonNullType(t.type).translate(this)
    ].join("");
  }

  public translateResolverDefinition(t: IR.ResolverDefinition): string {
    const argsType = t.arguments.length
      ? `{\n${translateAndIndent(t.arguments, this)}\n}`
      : "{}";

    const parentType = t.queryOrMutation
      ? "any"
      : t.parent.name +
        "Representation<TInternalReps>" +
        (t.requires.types.length ? " & " + t.requires.translate(this) : "");
    const returnType = t.type.translate(this);

    return [
      t.description.translate(this),
      t.name,
      t.queryOrMutation ? ": " : "?: ",
      `(parent: ${parentType}, args: ${argsType}, context: TContext, info: any) => PromiseOrValue<${returnType}>`
    ].join("");
  }

  public translateFieldDefinition(t: IR.FieldDefinition): string {
    return [
      t.description.translate(this),
      t.name,
      "?: ",
      t.type.translate(this)
    ].join("");
  }

  public translateObjectDefinition(t: IR.ObjectDefinition): string {
    return [
      // If its the Query or Mutation type, don't bother exporting the base type
      ...(t.isQueryOrMutation
        ? []
        : [
            `type ${t.name}Representation<TInternalReps extends Record<string, any>> = Index<TInternalReps, "${t.name}", any>\n`,
            t.description.translate(this),
            `export interface ${t.name} {\n`,
            translateAndIndent(t.fields, this),
            "\n}\n"
          ]),

      // Make the actual Resolver type.
      t.description.translate(this),
      `export interface ${t.name}Resolver<TContext = {}, TInternalReps = {}> {\n`,
      translateAndIndent(t.resolvers, this),

      `\n}\n`
    ].join("");
  }

  public translateEntityDefinition(t: IR.ObjectDefinition): string {
    return [
      // Make the Representation type. This is what gets passed to __resolveReference, and what TParent gets set to in resolvers.
      `type ${t.name}Representation<TInternalReps extends Record<string, any>> = Index<TInternalReps, "${t.name}", {}> & (`,
      t.keys.map(key => key.translate(this)).join(" | "),
      ")\n\n",

      // Make the root type. This is what __resolveRepresentation is expected to return.
      t.description.translate(this),
      `export type ${t.name}<TInternalReps = {}> = ${t.name}Representation<TInternalReps> & {\n`,
      translateAndIndent(t.fields, this),
      "\n}\n",

      t.description.translate(this),
      `export interface ${t.name}Resolver<TContext = {}, TInternalReps = {}> {\n`,
      `  __resolveReference?: (parent: ${t.name}Representation<{ /* explicity don't pass TInternalReps */ }>, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<${t.name}>>\n`,
      translateAndIndent(t.resolvers, this),
      `\n}\n`
    ].join("");
  }

  public translateEnumDefinition(t: IR.EnumDefinition): string {
    // punt internal enum values to `any` for now. Wait for feedback about how people use it.
    const options = t.values.map(value => `"${value}"`).join(" | ");

    return this.options.__experimentalInternalEnumValueSupport
      ? [
          `export type ${t.name}External = ${options}`,
          `export type ${t.name} = any`
        ].join("\n")
      : `export type ${t.name} = ${options}`;
  }

  public translateScalarDefinition(t: IR.ScalarDefinition): string {
    // punt scalars to `any` for now. Wait for feedback about how people use it.
    return `export type ${t.name} = any`;
  }
}
