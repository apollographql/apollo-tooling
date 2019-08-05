import { Translator } from ".";
import * as IR from "../IR";

export class TypeScriptTranslator extends Translator {
  public generate(
    objects: IR.ObjectDefinition[],
    enums: IR.EnumDefinition[],
    scalars: IR.ScalarDefinition[],
    unions: IR.UnionDefinition[],
    inputObjects: IR.InputObjectDefinition[]
  ): string {
    const header = this.generateHeader();
    const resolvers = this.generateTopLevelResolvers(
      objects.map(d => d.name),
      enums.map(e => e.name),
      scalars.map(s => s.name)
    );

    return [
      header,
      resolvers,
      ...[...objects, ...enums, ...scalars, ...unions, ...inputObjects].map(
        def => def.translate(this)
      )
    ].join("\n");
  }

  private generateHeader() {
    // Generate some utility higher order types that we'll reference later on.
    return `// This is a machine generated file.
// Use "apollo service:codegen" to regenerate.
type PromiseOrValue<T> = Promise<T> | T
type Nullable<T> = T | null | undefined
type Index<Map extends Record<string, any>, Key extends string, Else = unknown> = Map[Key] extends object | string | number ? Map[Key] : Else
type OptionTypes = { InternalReps?: Record<string, object>; Context?: Record<string, any>; Scalars?: Record<string, any>; Enums?: Record<string, any>; }
`;
  }

  private generateTopLevelResolvers(
    types: string[],
    enums: string[],
    scalars: string[]
  ) {
    return [
      `export interface Resolvers<TOptions extends OptionTypes = {}> {`,
      ...types.map(type =>
        this.rootTypes.includes(type)
          ? `${type}: ${type}Resolver<TOptions>`
          : `${type}?: ${type}Resolver<TOptions>`
      ),
      ...scalars.map(scalar => `${scalar}: any`),
      ...enums.map(
        _enum =>
          `${_enum}?: Record<${_enum}External, Index<Index<TOptions, "Enums", any>, "${_enum}">>`
      ),
      `}\n`
    ].join("\n");
  }

  public translateDescription(t: IR.Description): string {
    return "/**\n * " + t.description.split("\n").join("\n * ") + "\n */\n";
  }

  public translateNamedType(t: IR.NamedType, nullable: boolean): string {
    let name = (() => {
      switch (t.name) {
        case "Int":
          return "number";
        case "Float":
          return "number";
        case "Boolean":
          return "boolean";
        case "ID":
          return "string";
        case "String":
          return "string";
        default:
          return t.name + "<TOptions>";
      }
    })();

    return nullable ? `Nullable<${name}>` : name;
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
    if (t.isNonResolvableExternal) {
      return `${t.name}?: never // non-resolvable: marked @external and not @provide'd by any fields or used in any @key's`;
    }

    const argsType =
      "{" + t.arguments.map(arg => arg.translate(this)).join("\n") + "}";

    const parentType =
      t.parent.name +
      "Representation<TOptions>" +
      (t.requires.types.length ? " & " + t.requires.translate(this) : "");

    const returnType = t.type.translate(this);

    return [
      t.description.translate(this),
      t.name,
      t.isRootType ? ": " : "?: ",
      `(parent: ${parentType}, args: ${argsType}, context: Index<TOptions, "Context">, info: any) => PromiseOrValue<${returnType}>`
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

  /**
   * Translate basic objects (non-federated), with any number of interfaces.
   */
  public translateObjectDefinition(t: IR.ObjectDefinition): string {
    const representation =
      t.interfaces.map(iface => `${iface}Representation<TOptions> &`).join("") +
      `Index<Index<TOptions, "InternalReps", {}>, "${t.name}">`;

    const { extending, extendingResolvers } = generateInterfaceImplementations(
      t
    );

    return [
      `type ${t.name}Representation<TOptions extends Record<string, any>> = ${representation}\n`,

      // If its a Base type (query, mutation, or subscription), don't bother exporting the base type
      ...(t.isRootType
        ? []
        : [
            t.description.translate(this),
            `type ${t.name}<TOptions = {}> = ${extending} & {\n`,
            ...t.fields.map(field => field.translate(this) + "\n"),
            "}\n"
          ]),

      // Make the actual Resolver type.
      t.description.translate(this),
      `export interface ${t.name}Resolver<TOptions = {}> ${extendingResolvers}{\n`,
      ...t.resolvers.map(resolver => resolver.translate(this) + "\n"),
      `}\n`
    ].join("");
  }

  /**
   * Translate federated types and interfaces.
   */
  public translateEntityDefinition(t: IR.ObjectDefinition): string {
    const representation =
      t.interfaces.map(iface => `${iface}Representation<TOptions> &`).join("") +
      `Index<Index<TOptions, "InternalReps", {}>, "${t.name}">`;

    const { extending, extendingResolvers } = generateInterfaceImplementations(
      t
    );

    return [
      // Make the Representation type. This is what gets passed to __resolveReference, and what TParent gets set to in resolvers.
      `type ${t.name}Representation<TOptions extends Record<string, any>> = ${representation} & (`,
      t.keys.map(key => key.translate(this)).join(" | "),
      ")\n\n",

      // Make the root type. This is what __resolveRepresentation is expected to return.
      t.description.translate(this),
      `type ${t.name}<TOptions = {}> = ${extending} & {\n`,
      ...t.fields.map(field => field.translate(this) + "\n"),
      "}\n",

      t.description.translate(this),
      `export interface ${t.name}Resolver<TOptions = {}> ${extendingResolvers} {\n`,
      `__resolveReference?: (parent: ${t.name}Representation<{ /* explicity don't pass InternalReps */ }>, context: Index<TOptions, "Context">, info: any) => PromiseOrValue<Nullable<${t.name}>>\n`,
      ...t.resolvers.map(resolver => resolver.translate(this) + "\n"),
      `}\n`
    ].join("");
  }

  public translateInterfaceDefinition(t: IR.ObjectDefinition): string {
    return [
      `type ${t.name}Representation<TOptions extends Record<string, any>> = `,
      t.keys.length
        ? "(" + t.keys.map(key => key.translate(this)).join(" | ") + ")"
        : t.name,
      ` & Index<Index<TOptions, "InternalReps", {}>, "${t.name}"> \n\n`,

      t.description.translate(this),
      `interface ${t.name}<TOptions = {}> {\n`,
      ...t.fields.map(field => field.translate(this) + "\n"),
      `}\n`,

      t.description.translate(this),
      `export interface ${t.name}Resolver<TOptions = {}> {\n`,
      `__resolveType?: (parent: ${t.name}Representation<TOptions>, args: {}, context: Context, info: any) => PromiseOrValue<Nullable<string>>\n`,
      "}\n"
    ].join("");
  }

  public translateEnumDefinition(t: IR.EnumDefinition): string {
    const options = t.values.map(value => `"${value}"`).join(" | ");
    return (
      t.description.translate(this) +
      `type ${t.name}External = ${options}\n` +
      `type ${t.name}<TOptions = {}> = Index<Index<TOptions,"Enums", {}>, "${t.name}", ${t.name}External>\n`
    );
  }

  public translateScalarDefinition(t: IR.ScalarDefinition): string {
    return (
      t.description.translate(this) +
      `type ${t.name}<TOptions = {}> = Index<Index<TOptions,"Scalars", {}>, "${t.name}">`
    );
  }

  public translateUnionDefinition(t: IR.UnionDefinition): string {
    return [
      t.description.translate(this),
      `type ${t.name} = ${t.types.join(" | ")}\n`,
      `export interface ${t.name}Resolver<TOptions = {}> {\n`,
      `__resolveType?: (parent: any, args: {}, context: Index<TOptions, "Context">, info: any) => PromiseOrValue<Nullable<${t.types
        .map(t => `"${t}"`)
        .join(" | ")}>>\n`,
      "}\n"
    ].join("");
  }

  public translateInputObjectDefinition(t: IR.InputObjectDefinition): string {
    return (
      t.description.translate(this) +
      [
        "export type ",
        t.name,
        "<TContext = {}> = { \n",
        t.args.map(arg => arg.translate(this)).join("\n"),
        " } \n"
      ].join("")
    );
  }
}

/**
 * When t implements:
 *
 *  0 interfaces:
 *
 *    {extending: '', extendingResolvers: ''}
 *
 *  1+ interfaces:
 *
 *    {extending: 'extends MyInterface[, ...]',
 *     extendingResolvers: 'extends MyInterface<TOptions>[, ....]'}
 */
function generateInterfaceImplementations(t: IR.ObjectDefinition) {
  const extending = [
    `Partial<${t.name}Representation<TOptions>>`,
    ...t.interfaces
  ].join(" & ");

  const extendingResolvers = t.interfaces.length
    ? "extends " +
      t.interfaces.map(iface => `${iface}Resolver<TOptions>`).join(", ")
    : "";
  return { extending, extendingResolvers };
}
