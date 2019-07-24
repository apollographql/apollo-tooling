import {
  FieldDefinitionNode,
  FieldNode,
  InputValueDefinitionNode,
  OperationDefinitionNode,
  parse,
  StringValueNode
} from "graphql";
import { Translatable, Translator } from "../Translators";
import { Description } from "./Descriptions";
import { TypelessObjectDefinition } from "./Objects";
import { CompoundType, findRootType, makeType, TypeDefinition } from "./Types";

const flatMap = <T, E>(array: readonly T[], callback: (e: T) => readonly E[]) =>
  ([] as E[]).concat.apply([], array.map(callback));

const parseSelections = (source: string) =>
  (parse(`query { ${source} }`).definitions[0] as OperationDefinitionNode)
    .selectionSet.selections as (readonly FieldNode[]);

export class ArgumentDefinition implements Translatable {
  public description: Description;
  public name: string;
  public type: TypeDefinition;

  constructor(argumentDefinition: InputValueDefinitionNode) {
    this.description = new Description(argumentDefinition);
    this.name = argumentDefinition.name.value;
    this.type = makeType(argumentDefinition.type);
  }

  public translate(translator: Translator) {
    return translator.translateArgumentDefinition(this);
  }
}

/**
 * Shell class to provide info on @provides directives until we can bootstrap with global type definitions.
 * Bootstrap into a `ResolverDefinition` by calling `applyGlobalTypeKnowledge` once all types are known.
 */
export class TypelessResolverDefinition {
  constructor(
    public fieldDefinition: FieldDefinitionNode,
    public parent: TypelessObjectDefinition,
    public isRootType: boolean
  ) {}

  public getName() {
    return this.fieldDefinition.name.value;
  }

  public getProvides() {
    return flatMap(
      (this.fieldDefinition.directives || [])
        .filter(
          directive =>
            directive.name.value === "provides" &&
            directive.arguments &&
            directive.arguments.length
        )
        .map(key => (key.arguments![0].value as StringValueNode).value),
      providedFields =>
        providedFields.split(" ").map(field => ({
          field,
          type: findRootType(makeType(this.fieldDefinition.type))
        }))
    );
  }

  public applyGlobalTypeKnowledge(
    types: TypelessObjectDefinition[],
    isProvided: boolean
  ) {
    return new ResolverDefinition(this, types, isProvided);
  }
}

export class ResolverDefinition implements Translatable {
  public arguments: ArgumentDefinition[];
  public name: string;
  public type: TypeDefinition;
  public description: Description;
  public isNotProvidedAndExternal: boolean;
  public requires: CompoundType;
  public parent: TypelessObjectDefinition;
  public isRootType: boolean;

  constructor(
    typeless: TypelessResolverDefinition,
    types: TypelessObjectDefinition[],
    public isProvided: boolean
  ) {
    this.arguments = (typeless.fieldDefinition.arguments || []).map(
      argumentDefinition => new ArgumentDefinition(argumentDefinition)
    );
    const isExternal = (typeless.fieldDefinition.directives || []).some(
      directive => directive.name.value === "external"
    );

    this.isNotProvidedAndExternal = !isProvided && isExternal;

    this.isRootType = typeless.isRootType;
    this.name = typeless.fieldDefinition.name.value;
    this.type = makeType(typeless.fieldDefinition.type);
    this.description = new Description(typeless.fieldDefinition);
    this.parent = typeless.parent;

    this.requires = new CompoundType(
      flatMap(
        (typeless.fieldDefinition.directives || [])
          .filter(
            directive =>
              directive.name.value === "requires" &&
              directive.arguments &&
              directive.arguments.length
          )
          .map(key => (key.arguments![0].value as StringValueNode).value),
        selectionString => parseSelections(selectionString)
      ),
      typeless.parent,
      types
    );
  }

  public translate(translator: Translator) {
    return translator.translateResolverDefinition(this);
  }
}
