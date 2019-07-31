import "apollo-env";
import { DocumentNode, parse } from "graphql";
import { sdlToIR } from "./IR";
import {
  Translator,
  TranslatorOptions,
  TypeScriptTranslator
} from "./Translators";

export type Language = "typescript";

const translatorForLanguage: Record<
  Language,
  new (...args: any[]) => Translator // TODO: how to type the constructor args?
> = {
  typescript: TypeScriptTranslator
};

export const translate = (
  sdl: string | DocumentNode,
  language: Language,
  options: TranslatorOptions = {}
) => {
  const docNode: DocumentNode = typeof sdl === "string" ? parse(sdl) : sdl;
  const errors: string[] = [];
  const { topLevelDefinitions, operationNames } = sdlToIR(docNode, errors);
  if (errors.length) {
    throw Error(errors.join("\n"));
  }

  const translator = new translatorForLanguage[language](
    Object.values(operationNames),
    options
  );
  return translator.generate(...topLevelDefinitions);
};
