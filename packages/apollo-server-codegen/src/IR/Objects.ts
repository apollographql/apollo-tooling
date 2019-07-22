import {
  FieldDefinitionNode,
  FieldNode,
  ObjectTypeDefinitionNode,
  ObjectTypeExtensionNode,
  OperationDefinitionNode,
  parse,
  StringValueNode
} from "graphql";

import { Translatable, Translator } from "../Translators";
import { Description } from "./Descriptions";
import { ResolverDefinition, TypelessResolverDefinition } from "./Resolvers";
import { CompoundType, makeType, TypeDefinition } from "./Types";

const parseSelections = (source: string) =>
  (parse(`query { ${source} }`).definitions[0] as OperationDefinitionNode)
    .selectionSet.selections as (readonly FieldNode[]);

export class FieldDefinition implements Translatable {
  public name: string;
  public type: TypeDefinition;
  public description: Description;

  constructor(
    fieldDefinition: FieldDefinitionNode,
    public queryOrMutation: boolean
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

  constructor(
    private definition: ObjectTypeDefinitionNode | ObjectTypeExtensionNode
  ) {
    this.name = definition.name.value;
    const isQueryOrMutation = this.name === "Query" || this.name === "Mutation";
    this.resolvers = (definition.fields || []).map(
      field => new TypelessResolverDefinition(field, this, isQueryOrMutation)
    );
    this.fields = (definition.fields || []).map(
      field => new FieldDefinition(field, isQueryOrMutation)
    );
  }

  public applyGlobalTypeKnowledge(
    types: TypelessObjectDefinition[],
    providedFields: string[]
  ): ObjectDefinition {
    return new ObjectDefinition(this.definition, this, types, providedFields);
  }
}

export class ObjectDefinition implements Translatable {
  public isQueryOrMutation: boolean;
  public description: Description;
  public resolvers: ResolverDefinition[];
  public fields: FieldDefinition[];
  public name: string;
  public keys: Translatable[];
  public isTypeExtension: boolean;

  constructor(
    definition: ObjectTypeDefinitionNode | ObjectTypeExtensionNode,
    typeless: TypelessObjectDefinition,
    types: TypelessObjectDefinition[],
    provided: string[]
  ) {
    this.name = definition.name.value;
    this.isTypeExtension = definition.kind === "ObjectTypeExtension";
    this.description = new Description(definition as any);
    this.isQueryOrMutation = this.name === "Query" || this.name === "Mutation";

    this.keys = (definition.directives || [])
      .filter(
        directive =>
          directive.name.value === "key" &&
          directive.arguments &&
          directive.arguments.length
      )
      .map(key => (key.arguments![0].value as StringValueNode).value)
      .map(selectionString => parseSelections(selectionString))
      .map(compoundKey => new CompoundType(compoundKey, typeless, types));

    this.fields = typeless.fields;
    this.resolvers = typeless.resolvers.map(typeless =>
      typeless.applyGlobalTypeKnowledge(
        types,
        provided.indexOf(typeless.getName()) >= 0
      )
    );
  }

  public translate(translator: Translator) {
    return this.keys.length
      ? translator.translateEntityDefinition(this)
      : translator.translateObjectDefinition(this);
  }
}
