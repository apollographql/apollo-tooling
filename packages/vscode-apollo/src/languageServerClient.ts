import {
  ServerOptions,
  TransportKind,
  LanguageClientOptions,
  LanguageClient
} from "vscode-languageclient";
import { workspace, OutputChannel } from "vscode";

const { version, referenceID } = require("../package.json");

export function getLanguageServerClient(
  serverModule: string,
  outputChannel: OutputChannel
) {
  const env = {
    APOLLO_CLIENT_NAME: "Apollo VS Code",
    APOLLO_CLIENT_VERSION: version,
    APOLLO_CLIENT_REFERENCE_ID: referenceID
  };

  const debugOptions = {
    execArgv: ["--nolazy", "--inspect=6009"],
    env
  };

  const serverOptions: ServerOptions = {
    run: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: {
        env
      }
    },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      "graphql",
      "javascript",
      "typescript",
      "javascriptreact",
      "typescriptreact",
      "python"
    ],
    synchronize: {
      fileEvents: [
        workspace.createFileSystemWatcher("**/package.json"),
        workspace.createFileSystemWatcher("**/.env"),
        workspace.createFileSystemWatcher("**/*.{graphql,js,ts,jsx,tsx,py}")
      ]
    },
    outputChannel
  };

  return new LanguageClient(
    "apollographql",
    "Apollo GraphQL",
    serverOptions,
    clientOptions
  );
}
