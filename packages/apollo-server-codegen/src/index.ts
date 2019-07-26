import "apollo-env";
import { DocumentNode } from "graphql";
import gql from "graphql-tag";
import { sdlToIR } from "./IR";
import {
  Translator,
  TranslatorOptions,
  TypeScriptTranslator
} from "./Translators";

export type Language = "ts" | "typescript";

const translatorForLanguage: Record<
  Language,
  new (...args: any[]) => Translator
> = {
  ts: TypeScriptTranslator,
  typescript: TypeScriptTranslator
};

export const translate = (
  sdl: string | DocumentNode,
  language: Language,
  options: TranslatorOptions = {}
) => {
  const translator = new translatorForLanguage[language](options);
  const docNode: DocumentNode = typeof sdl === "string" ? gql(sdl) : sdl;

  return translator.generate(...sdlToIR(docNode));
};
