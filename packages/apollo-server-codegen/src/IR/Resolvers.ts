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
  makeVSCodeError,
  allElements
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
 * `ResolverDefinition` without global knowledge of types,
 * as such unable to properly translate because `@requires` types aren't known
 *
 * Convert to `ResolverDefinition` by providing array of all `TypelessObjectDefinition`'s to `applyGlobalTypeKnowledge`, along with whether this field can be resolved.
 **/
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
    if (provideDirectives.length === 0) return [];

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

    const compounds = provideDirectives.flatMap(
      compound =>
        new CompoundType(
          compound.selections,
          providedObject,
          types,
          compound.arguments![0].value.loc!.start,
          errors
        )
    );

    return compounds.flatMap(allElements);
  }

  /**
   * @param types All types present in the schema
   * @param isResolvable Whether this field can be resolved (not `external`, or `external` but used in a `key` or `provides`)
   * @param errors Build errors will be pushed to this array in order to report all errors at once versus throwing on the first one.
   */
  public applyGlobalTypeKnowledge(
    types: TypelessObjectDefinition[],
    isResolvable: boolean,
    errors: string[]
  ) {
    return new ResolverDefinition(this, types, isResolvable, errors);
  }
}

export class ResolverDefinition implements Translatable {
  public arguments: ArgumentDefinition[];
  public name: string;
  public type: TypeDefinition;
  public description: Description;
  public isNonResolvableExternal: boolean;
  public requires: CompoundType;
  public parent: TypelessObjectDefinition;
  public isRootType: boolean;

  constructor(
    typeless: TypelessResolverDefinition,
    types: TypelessObjectDefinition[],
    public isResolvable: boolean,
    errors: string[]
  ) {
    this.arguments = (typeless.fieldDefinition.arguments || []).map(
      argumentDefinition => new ArgumentDefinition(argumentDefinition)
    );
    const isExternal = (typeless.fieldDefinition.directives || []).some(
      directive => directive.name.value === "external"
    );

    this.isNonResolvableExternal = !isResolvable && isExternal;

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
      ? requiresSelections[0].arguments![0].value.loc
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
