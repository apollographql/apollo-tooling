import "apollo-env";
import { DocumentNode } from "graphql";
import gql from "graphql-tag";
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
  const docNode: DocumentNode = typeof sdl === "string" ? gql(sdl) : sdl;
  const { topLevelDefinitions, operationNames } = sdlToIR(docNode);

  const translator = new translatorForLanguage[language](
    Object.values(operationNames),
    options
  );
  return translator.generate(...topLevelDefinitions);
};
