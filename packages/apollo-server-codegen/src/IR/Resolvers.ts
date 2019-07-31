import { FieldDefinitionNode, InputValueDefinitionNode } from "graphql";
import { Translatable, Translator } from "../Translators";
import { Description } from "./Descriptions";
import { TypelessObjectDefinition } from "./Objects";
import {
  CompoundType,
  findRootType,
  makeType,
  TypeDefinition,
  NonNullType
} from "./Types";
import {
  findFederationDirectivesWithSelections,
  makeVSCodeError
} from "./utils";

export class ArgumentDefinition implements Translatable {
  public description: Description;
  public name: string;
  public type: TypeDefinition;

  constructor(argumentDefinition: InputValueDefinitionNode) {
    this.description = new Description(argumentDefinition);
    this.name = argumentDefinition.name.value;
    this.type = makeType(argumentDefinition.type);
    if (argumentDefinition.defaultValue) this.type = new NonNullType(this.type);
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

  public getProvides(types: TypelessObjectDefinition[], errors: string[]) {
    const provideDirectives = findFederationDirectivesWithSelections(
      this.fieldDefinition.directives,
      "provides"
    );

    const providedSelections = provideDirectives.flatMap(
      directive => directive.selections
    );

    if (providedSelections.length === 0) return [];

    const fieldType = findRootType(makeType(this.fieldDefinition.type));
    const providedObject = types.find(type => type.name === fieldType);

    if (!providedObject) {
      const loc = this.fieldDefinition.type.loc;
      errors.push(
        makeVSCodeError(
          loc!.start,
          loc!.end,
          `Could not find type ${fieldType}.`
        )
      );
      return [];
    }

    const loc = provideDirectives[0]!.arguments![0].value.loc!;
    const compound = new CompoundType(
      providedSelections,
      providedObject,
      types,
      loc.start,
      errors
    );

    const provides = (
      compound: CompoundType
    ): { objectName: string; fieldName: string }[] =>
      compound.types.flatMap(field => [
        { fieldName: field.name, objectName: field.baseType.name },
        ...(field.type instanceof CompoundType ? provides(field.type) : [])
      ]);

    return provides(compound);
  }

  public applyGlobalTypeKnowledge(
    types: TypelessObjectDefinition[],
    isProvided: boolean,
    errors: string[]
  ) {
    return new ResolverDefinition(this, types, isProvided, errors);
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
    public isProvided: boolean,
    errors: string[]
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

    const requiresSelections = findFederationDirectivesWithSelections(
      typeless.fieldDefinition.directives,
      "requires"
    );

    const loc = requiresSelections[0]
      ? requiresSelections[0].loc
      : { start: 0, end: 0 };

    this.requires = new CompoundType(
      requiresSelections.flatMap(directive => directive.selections),
      typeless.parent,
      types,
      loc!.start,
      errors
    );
  }

  public translate(translator: Translator) {
    return translator.translateResolverDefinition(this);
  }
}
