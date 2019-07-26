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
type Index<Map extends Record<string, any>, Key extends string, IfMissing> = Map[Key] extends object ? Map[Key] : IfMissing
`;
  }

  private generateTopLevelResolvers(
    types: string[],
    enums: string[],
    scalars: string[]
  ) {
    return [
      `export interface Resolvers<TContext = {}, TInternalReps = {}> {`,
      ...types.map(type =>
        type === "Query" || type === "Mutation" || type === "Subscription"
          ? `${type}: ${type}Resolver<TContext, TInternalReps>`
          : `${type}?: ${type}Resolver<TContext, TInternalReps>`
      ),
      ...scalars.map(scalar => `  ${scalar}: any`),
      ...(this.options.__experimentalInternalEnumValueSupport
        ? enums.map(
            enumName => `${enumName}: { [external: ${enumName}External]: any }`
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
    if (t.isNotProvidedAndExternal) {
      return `${t.name}?: never // non-resolvable: marked @external and not @provide'd by any fields`;
    }

    const argsType = t.arguments.length
      ? `{\n${t.arguments.map(arg => arg.translate(this)).join("\n")}\n}`
      : "{}";

    const parentType =
      t.parent.name +
      "Representation<TInternalReps>" +
      (t.requires.types.length ? " & " + t.requires.translate(this) : "");
    const returnType = t.type.translate(this);

    return [
      t.description.translate(this),
      t.name,
      t.isRootType ? ": " : "?: ",
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

  /**
   * Translate Basic objects (and interfaces) that are non-federated, with any number of interfaces. Example:
   *
   * GraphQL:
   * ```gql
   * interface MyInterface {
   *   thing: String!
   * }
   *
   * type User implements MyInterface {
   *   name(locale: String): String!
   * }
   * ```
   *
   * TS:
   * ```ts
   * type MyInterfaceRepresentation<TInternalReps extends Record<string, any>> = Index<TInternalReps, "MyInterface", any>;
   * export interface MyInterface { thing?: string; }
   * export interface MyInterfaceResolver<TContext = {}, TInternalReps = {}> {
   *   thing?: ( parent: MyInterfaceRepresentation<TInternalReps>, args: {}, context: TContext, info: any ) => PromiseOrValue<string>;
   * }
   *
   * type UserRepresentation<TInternalReps extends Record<string, any>> =
   *     MyInterfaceRepresentation<TInternalReps> & Index<TInternalReps, "User", {}>;
   * export interface User extends MyInterface { name?: string;  }
   * export interface UserResolver<TContext = {}, TInternalReps = {}> extends MyInterfaceResolver<TContext, TInternalReps> {
   *   name?: (parent: UserRepresentation<TInternalReps>, args: { locale?: string; }, context: TContext, info: any) => PromiseOrValue<string>;
   * }
   * ```
   */
  public translateObjectDefinition(t: IR.ObjectDefinition): string {
    const representation = t.interfaces.length
      ? t.interfaces
          .map(iface => `${iface}Representation<TInternalReps> &`)
          .join("") + `Index<TInternalReps, "${t.name}", {}>`
      : `Index<TInternalReps, "${t.name}", any>`;

    const { extending, extendingResolvers } = generateInterfaceImplementations(
      t
    );

    return [
      `type ${t.name}Representation<TInternalReps extends Record<string, any>> = ${representation}\n`,

      // If its a Base type (query, mutation, or subscription), don't bother exporting the base type
      ...(t.isRootType
        ? []
        : [
            t.description.translate(this),
            `export interface ${t.name} ${extending}{\n`,
            ...t.fields.map(field => field.translate(this) + "\n"),
            "}\n"
          ]),

      // Make the actual Resolver type.
      t.description.translate(this),
      `export interface ${t.name}Resolver<TContext = {}, TInternalReps = {}> ${extendingResolvers}{\n`,
      ...t.resolvers.map(resolver => resolver.translate(this) + "\n"),
      `}\n`
    ].join("");
  }

  /**
   * Translate federated types and interfaces. Example:
   *
   * GraphQL:
   * ```gql
   * interface MyInterface @key(fields: "thing") {
   *   thing: String!
   * }
   *
   * type User implements MyInterface @key(fields: "name") {
   *   name(locale: String): String!
   * }
   * ```
   *
   * TS:
   * ```ts
   * type MyInterfaceRepresentation<TInternalReps extends Record<string, any>> =
   *     Index<TInternalReps, "MyInterface", {}> & ({ thing: string });
   *
   * export interface MyInterface { thing?: string; }
   * export interface MyInterfaceResolver<TContext = {}, TInternalReps = {}> {
   *   __resolveReference?: ( parent: MyInterfaceRepresentation<{ }>, args: {}, context: TContext, info: any ) => PromiseOrValue<Nullable<MyInterface>>;
   *   thing?: ( parent: MyInterfaceRepresentation<TInternalReps>, args: {}, context: TContext, info: any ) => PromiseOrValue<string>;
   * }
   *
   * type UserRepresentation<TInternalReps extends Record<string, any>> =
   *   MyInterfaceRepresentation<TInternalReps>
   *      & Index<TInternalReps, "User", {}>
   *      & ({ name: string });
   *
   * export interface User extends MyInterface { name?: string; }
   * export interface UserResolver<TContext = {}, TInternalReps = {}>
   *   extends MyInterfaceResolver<TContext, TInternalReps> {
   *   __resolveReference?: ( parent: UserRepresentation<{ }>, args: {}, context: TContext, info: any ) => PromiseOrValue<Nullable<User>>;
   *   name?: ( parent: UserRepresentation<TInternalReps>, args: { locale?: string; }, context: TContext, info: any
   *   ) => PromiseOrValue<string>;
   * }
   * ```
   *
   */
  public translateEntityDefinition(t: IR.ObjectDefinition): string {
    const representation =
      t.interfaces
        .map(iface => `${iface}Representation<TInternalReps> &`)
        .join("") + `Index<TInternalReps, "${t.name}", {}>`;

    const { extending, extendingResolvers } = generateInterfaceImplementations(
      t
    );

    return [
      // Make the Representation type. This is what gets passed to __resolveReference, and what TParent gets set to in resolvers.
      `type ${t.name}Representation<TInternalReps extends Record<string, any>> = ${representation} & (`,
      t.keys.map(key => key.translate(this)).join(" | "),
      ")\n\n",

      // Make the root type. This is what __resolveRepresentation is expected to return.
      t.description.translate(this),
      `export interface ${t.name} ${extending} {\n`,
      ...t.fields.map(field => field.translate(this) + "\n"),
      "}\n",

      t.description.translate(this),
      `export interface ${t.name}Resolver<TContext = {}, TInternalReps = {}> ${extendingResolvers} {\n`,
      `__resolveReference?: (parent: ${t.name}Representation<{ /* explicity don't pass TInternalReps */ }>, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<${t.name}>>\n`,
      ...t.resolvers.map(resolver => resolver.translate(this) + "\n"),
      `}\n`
    ].join("");
  }

  public translateInterfaceDefinition(t: IR.ObjectDefinition): string {
    return [
      `type ${t.name}Representation<TInternalReps extends Record<string, any>> = `,
      t.keys.length
        ? "(" + t.keys.map(key => key.translate(this)).join(" | ") + ")"
        : t.name,
      ` & Index<TInternalReps, "${t.name}", {}> \n\n`,

      t.description.translate(this),
      `export interface ${t.name} {\n`,
      ...t.fields.map(field => field.translate(this) + "\n"),
      `}\n`,

      t.description.translate(this),
      `export interface ${t.name}Resolver<TContext = {}, TInternalReps = {}> {\n`,
      `__resolveType?: (parent: ${t.name}Representation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<string>>\n`,
      "}\n"
    ].join("");
  }

  public translateEnumDefinition(t: IR.EnumDefinition): string {
    // punt internal enum values to `any` for now. Wait for feedback about how people use it.
    const options = t.values.map(value => `"${value}"`).join(" | ");

    return (
      t.description.translate(this) +
      (this.options.__experimentalInternalEnumValueSupport
        ? [
            `export type ${t.name}External = ${options}`,
            `export type ${t.name} = any\n`
          ].join("\n")
        : `export type ${t.name} = ${options}\n`)
    );
  }

  public translateScalarDefinition(t: IR.ScalarDefinition): string {
    // punt scalars to `any` for now. Wait for feedback about how people use it.
    return t.description.translate(this) + `export type ${t.name} = any`;
  }

  public translateUnionDefinition(t: IR.UnionDefinition): string {
    return [
      t.description.translate(this),
      `type ${t.name} = ${t.types.join(" | ")}\n`,
      `export interface ${t.name}Resolver<TContext = {}, TInternalReps = {}> {\n`,
      `__resolveType?: (parent: any, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<${t.types
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
        "= { \n",
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
 *     extendingResolvers: 'extends MyInterface<TContext, TInternalReps>[, ...]'}
 */
function generateInterfaceImplementations(t: IR.ObjectDefinition) {
  const extending = t.interfaces.length
    ? "extends " + t.interfaces.map(iface => `${iface}`).join(", ")
    : "";
  const extendingResolvers = t.interfaces.length
    ? "extends " +
      t.interfaces
        .map(iface => `${iface}Resolver<TContext, TInternalReps>`)
        .join(", ")
    : "";
  return { extending, extendingResolvers };
}
