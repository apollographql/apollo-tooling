import { ScalarTypeDefinitionNode } from "graphql";
import { Translatable, Translator } from "../Translators";
import { Description } from "./Descriptions";

export class ScalarDefinition implements Translatable {
  public name: string;
  public description: Description;
  constructor(definition: ScalarTypeDefinitionNode) {
    this.name = definition.name.value;
    this.description = new Description(definition);
  }

  public translate(translator: Translator) {
    return translator.translateScalarDefinition(this);
  }
}
