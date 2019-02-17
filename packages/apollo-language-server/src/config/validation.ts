import { ApolloConfigFormat } from "./config";
import { Diagnostic } from "vscode-languageserver";

function topLevelKeys(config: ApolloConfigFormat) {
  const diagnostics: Diagnostic[] = [];
  const { client, service, ...invalidKeys } = config;
}
