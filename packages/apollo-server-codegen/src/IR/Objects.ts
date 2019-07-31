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
import { findFederationDirectivesWithSelections, allElements } from "./utils";

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

  public getKeys(types: TypelessObjectDefinition[], errors: string[]) {
    return findFederationDirectivesWithSelections(
      this.definition.directives,
      "key"
    )
      .map(
        key =>
          new CompoundType(
            key.selections,
            this,
            types,
            key.arguments![0].value.loc!.start,
            errors
          )
      )
      .flatMap(allElements);
  }

  public applyGlobalTypeKnowledge(
    types: TypelessObjectDefinition[],
    resolveableExternals: string[],
    errors: string[]
  ): ObjectDefinition {
    return new ObjectDefinition(
      this.definition,
      this,
      types,
      resolveableExternals,
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
    resolvableExternals: string[],
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

    this.keys = findFederationDirectivesWithSelections(
      definition.directives,
      "key"
    ).map(
      fieldSet =>
        new CompoundType(
          fieldSet.selections,
          typeless,
          types,
          fieldSet.arguments![0].value.loc!.start,
          errors
        )
    );

    this.fields = typeless.fields;
    this.resolvers = typeless.resolvers.map(typeless =>
      typeless.applyGlobalTypeKnowledge(
        types,
        resolvableExternals.indexOf(typeless.getName()) >= 0,
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
