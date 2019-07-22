import { EnumTypeDefinitionNode } from "graphql";
import { Translatable, Translator } from "../Translators";

export class EnumDefinition implements Translatable {
  public name: string;
  public values: string[];
  constructor(definition: EnumTypeDefinitionNode) {
    this.name = definition.name.value;
    this.values = (definition.values || []).map(value => value.name.value);
  }

  public translate(translator: Translator) {
    return translator.translateEnumDefinition(this);
  }
}
