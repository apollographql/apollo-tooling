import { EnumTypeDefinitionNode } from "graphql";
import { Translatable, Translator } from "../Translators";
import { Description } from "./Descriptions";

export class EnumDefinition implements Translatable {
  public name: string;
  public values: string[];
  public description: Description;
  constructor(definition: EnumTypeDefinitionNode) {
    this.name = definition.name.value;
    this.values = (definition.values || []).map(value => value.name.value);
    this.description = new Description(definition);
  }

  public translate(translator: Translator) {
    return translator.translateEnumDefinition(this);
  }
}
