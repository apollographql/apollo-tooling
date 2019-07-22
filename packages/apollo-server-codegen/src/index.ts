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
  const [objectDefinitions, enumDefinitions, scalarDefinitions] = sdlToIR(
    docNode
  );

  const header = translator.generateHeader();
  const resolvers = translator.generateTopLevelResolvers(
    objectDefinitions.map(d => d.name),
    enumDefinitions.map(e => e.name),
    scalarDefinitions.map(s => s.name)
  );
  const translatedObjectDefinitions = objectDefinitions
    .map(definition => definition.translate(translator))
    .join("\n");
  const translatedEnumDefinitions = enumDefinitions
    .map(definition => definition.translate(translator))
    .join("\n");

  const translatedScalarDefinitions = scalarDefinitions
    .map(definition => definition.translate(translator))
    .join("\n");

  return [
    header,
    resolvers,
    translatedObjectDefinitions,
    translatedEnumDefinitions,
    translatedScalarDefinitions
  ].join("\n");
};
