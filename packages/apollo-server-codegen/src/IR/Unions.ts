import { UnionTypeDefinitionNode } from "graphql";
import { Translatable, Translator } from "../Translators";
import { Description } from "./Descriptions";

export class UnionDefinition implements Translatable {
  public name: string;
  public types: string[];
  public description: Description;
  constructor(definition: UnionTypeDefinitionNode) {
    this.name = definition.name.value;
    this.types = (definition.types || []).map(typeNode => typeNode.name.value);
    this.description = new Description(definition);
  }

  public translate(translator: Translator) {
    return translator.translateUnionDefinition(this);
  }
}
