import {
  FieldDefinitionNode,
  FieldNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  OperationDefinitionNode,
  parse,
  StringValueNode,
  isTypeExtensionNode,
  InterfaceTypeDefinitionNode,
  InterfaceTypeExtensionNode,
  Kind
} from "graphql";

import { Translatable, Translator } from "../Translators";
import { Description } from "./Descriptions";
import { ResolverDefinition, TypelessResolverDefinition } from "./Resolvers";
import { CompoundType, makeType, TypeDefinition } from "./Types";

// number of chars added in the below parse(`query { ${source} }`) call.
// This is needed for converting between the `loc` property `parse` will add to these FieldNode's,
// and the real location of errors in the source document
export const SELECTION_OFFSET = 7;
const parseSelections = (source: string) =>
  (parse(`query { ${source} }`).definitions[0] as OperationDefinitionNode)
    .selectionSet.selections as (readonly FieldNode[]);

export class FieldDefinition implements Translatable {
  public name: string;
  public type: TypeDefinition;
  public description: Description;

  constructor(
    fieldDefinition: FieldDefinitionNode,
    public isRootType: boolean
  ) {
    this.name = fieldDefinition.name.value;
    this.type = makeType(fieldDefinition.type);
    this.description = new Description(fieldDefinition);
  }

  public translate(translator: Translator) {
    return translator.translateFieldDefinition(this);
  }
}

// ObjectDefinition without global knowledge of types,
// as such unable to properly translate because `@key` types aren't known
// Convert to ObjectDefinition by providing array of all TypelessObjectDefinition's to `applyGlobalTypeKnowledge`
export class TypelessObjectDefinition {
  public resolvers: TypelessResolverDefinition[];
  public fields: FieldDefinition[];
  public name: string;
  public isRootType: boolean;

  constructor(
    public definition:
      | ObjectTypeDefinitionNode
      | ObjectTypeExtensionNode
      | InterfaceTypeDefinitionNode
      | InterfaceTypeExtensionNode,
    private rootTypes: string[]
  ) {
    this.name = definition.name.value;
    this.isRootType = rootTypes.includes(this.name);

    this.resolvers = (definition.fields || []).map(
      field => new TypelessResolverDefinition(field, this, this.isRootType)
    );
    this.fields = (definition.fields || []).map(
      field => new FieldDefinition(field, this.isRootType)
    );
  }

  public applyGlobalTypeKnowledge(
    types: TypelessObjectDefinition[],
    providedFields: string[],
    errors: string[]
  ): ObjectDefinition {
    return new ObjectDefinition(
      this.definition,
      this,
      types,
      providedFields,
      errors
    );
  }
}

export class ObjectDefinition implements Translatable {
  public isRootType: boolean;
  public description: Description;
  public resolvers: ResolverDefinition[];
  public fields: FieldDefinition[];
  public name: string;
  public keys: Translatable[];
  public isTypeExtension: boolean;
  public interfaces: string[];
  public isInterface: boolean;

  constructor(
    definition:
      | ObjectTypeDefinitionNode
      | ObjectTypeExtensionNode
      | InterfaceTypeDefinitionNode
      | InterfaceTypeExtensionNode,
    typeless: TypelessObjectDefinition,
    types: TypelessObjectDefinition[],
    provided: string[],
    errors: string[]
  ) {
    this.name = definition.name.value;
    this.isTypeExtension = isTypeExtensionNode(definition);
    this.description = new Description(definition as any);
    this.isRootType = typeless.isRootType;

    this.isInterface =
      definition.kind === Kind.INTERFACE_TYPE_DEFINITION ||
      definition.kind === Kind.INTERFACE_TYPE_EXTENSION;

    this.interfaces = ("interfaces" in definition
      ? definition.interfaces || []
      : []
    ).map(name => name.name.value);

    this.keys = (definition.directives || [])
      .filter(
        directive =>
          directive.name.value === "key" &&
          directive.arguments &&
          directive.arguments.length
      )
      .map(directive => directive.arguments![0].value as StringValueNode)
      .map(node => ({ selections: parseSelections(node.value), loc: node.loc }))
      .map(
        fieldSet =>
          new CompoundType(
            fieldSet.selections,
            typeless,
            types,
            [fieldSet.loc!.start, fieldSet.loc!.end],
            errors
          )
      );

    this.fields = typeless.fields;
    this.resolvers = typeless.resolvers.map(typeless =>
      typeless.applyGlobalTypeKnowledge(
        types,
        provided.indexOf(typeless.getName()) >= 0,
        errors
      )
    );
  }

  public translate(translator: Translator) {
    if (this.isInterface) return translator.translateInterfaceDefinition(this);
    return this.keys.length
      ? translator.translateEntityDefinition(this)
      : translator.translateObjectDefinition(this);
  }
}
