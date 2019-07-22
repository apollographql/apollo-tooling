import { Translatable, Translator } from "../Translators";

export class Description implements Translatable {
  public description: string;
  constructor(node: { description?: { value: string } }) {
    this.description = node.description ? node.description.value : "";
  }

  public translate(translator: Translator) {
    if (!this.description) return "";
    return translator.translateDescription(this);
  }
}
