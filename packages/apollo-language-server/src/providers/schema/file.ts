// FileSchemaProvider (FileProvider (SDL || IntrospectionResult) => schema)
import { GraphQLSchema, buildClientSchema, Source, buildSchema } from "graphql";
import { readFileSync } from "fs";
import { extname, resolve } from "path";
import { GraphQLSchemaProvider, SchemaChangeUnsubscribeHandler } from "./base";
import { NotificationHandler } from "vscode-languageserver";
import { Debug } from "../../utilities";

export interface FileSchemaProviderConfig {
  path: string;
}
// XXX file subscription
export class FileSchemaProvider implements GraphQLSchemaProvider {
  private schema?: GraphQLSchema;
  private federatedServiceSDL?: string;

  constructor(private config: FileSchemaProviderConfig) {}

  async resolveSchema() {
    if (this.schema) return this.schema;
    const { path } = this.config;
    let result;
    try {
      result = readFileSync(path, {
        encoding: "utf-8"
      });
    } catch (err) {
      throw new Error(`Unable to read file ${path}. ${err.message}`);
    }

    const ext = extname(path);

    // an actual introspectionQuery result
    if (ext === ".json") {
      const parsed = JSON.parse(result);
      const __schema = parsed.data
        ? parsed.data.__schema
        : parsed.__schema
        ? parsed.__schema
        : parsed;

      this.schema = buildClientSchema({ __schema });
    } else if (ext === ".graphql" || ext === ".graphqls" || ext === ".gql") {
      const uri = `file://${resolve(path)}`;
      this.schema = buildSchema(new Source(result, uri));
    }
    if (!this.schema) throw new Error(`Schema could not be loaded for ${path}`);
    return this.schema;
  }

  onSchemaChange(
    _handler: NotificationHandler<GraphQLSchema>
  ): SchemaChangeUnsubscribeHandler {
    throw new Error("File watching not implemented yet");
    return () => {};
  }

  async resolveFederatedServiceSDL() {
    if (this.federatedServiceSDL) return this.federatedServiceSDL;

    const { path } = this.config;
    let result;
    try {
      result = readFileSync(path, {
        encoding: "utf-8"
      });
    } catch (err) {
      return Debug.error(`Unable to read file ${path}. ${err.message}`);
    }

    const ext = extname(path);

    // this file should already be in sdl format
    if (ext === ".graphql" || ext === ".graphqls" || ext === ".gql") {
      this.federatedServiceSDL = result as string;
      return result as string;
    } else {
      return Debug.error(
        "When using localSchemaFile to check or push a federated service, you can only use .graphql, .gql, and .graphqls files"
      );
    }
  }
}
