import { ScalarTypeDefinitionNode } from "graphql";
import { Translatable, Translator } from "../Translators";

export class ScalarDefinition implements Translatable {
  public name: string;
  constructor(definition: ScalarTypeDefinitionNode) {
    this.name = definition.name.value;
  }

  public translate(translator: Translator) {
    return translator.translateScalarDefinition(this);
  }
}
