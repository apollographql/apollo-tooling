import { InputObjectTypeDefinitionNode } from "graphql";
import { Translatable, Translator } from "../Translators";
import { Description } from "./Descriptions";
import { ArgumentDefinition } from "./Resolvers";

export class InputObjectDefinition implements Translatable {
  public name: string;
  public description: Description;
  public args: ArgumentDefinition[];

  constructor(definition: InputObjectTypeDefinitionNode) {
    this.name = definition.name.value;
    this.description = new Description(definition);
    this.args = (definition.fields || []).map(
      field => new ArgumentDefinition(field)
    );
  }

  public translate(translator: Translator) {
    return translator.translateInputObjectDefinition(this);
  }
}
