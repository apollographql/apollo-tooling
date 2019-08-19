declare module "@apollographql/graphql-language-service-interface" {
  import { DocumentNode, GraphQLSchema, Location } from "@apollo/graphql";
  import {
    Diagnostic,
    Position,
    Range,
    CompletionItem
  } from "vscode-languageserver";

  function getAutocompleteSuggestions(
    schema: GraphQLSchema,
    queryText: string,
    position: Position
  ): CompletionItem[];
}

declare module "@apollographql/graphql-language-service-interface/dist/getAutocompleteSuggestions";

declare module "@apollographql/graphql-language-service-interface/dist/getDiagnostics" {
  import { Location } from "@apollo/graphql";
  import { Range } from "vscode-languageserver";

  function getRange(location: Location, queryText: string): Range;
}
