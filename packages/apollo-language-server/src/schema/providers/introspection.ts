// IntrospectionSchemaProvider (http => IntrospectionResult => schema)
import { NotificationHandler } from "vscode-languageserver";
import { execute as linkExecute, toPromise } from "apollo-link";
import { createHttpLink, HttpLink } from "apollo-link-http";
import {
  GraphQLSchema,
  buildClientSchema,
  getIntrospectionQuery,
  ExecutionResult,
  IntrospectionQuery,
  parse
} from "graphql";
import { Agent, AgentOptions } from "https";
import { fetch } from "apollo-env";
import { URL } from "url";

import { RemoteServiceConfig } from "../../config";
import { GraphQLSchemaProvider, SchemaChangeUnsubscribeHandler } from "./base";

export class IntrospectionSchemaProvider implements GraphQLSchemaProvider {
  private schema?: GraphQLSchema;
  constructor(private config: Exclude<RemoteServiceConfig, "name">) {}
  async resolveSchema() {
    if (this.schema) return this.schema;
    const { skipSSLValidation, url, headers } = this.config;
    let options: HttpLink.Options = { uri: url, fetch };

    if (skipSSLValidation) {
      const urlObject = new URL(url);
      const host = urlObject.host;
      const port = +urlObject.port || 443;

      const agentOptions: AgentOptions = {
        host: host,
        port: port,
        rejectUnauthorized: false
      };

      const agent = new Agent(agentOptions);

      options.fetchOptions = { agent: agent };
    }

    const { data, errors } = (await toPromise(
      linkExecute(createHttpLink(options), {
        query: parse(getIntrospectionQuery()),
        context: { headers }
      })
    )) as ExecutionResult<IntrospectionQuery>;

    if (errors) {
      // XXX better error handling of GraphQL errors
      throw new Error(errors.map(({ message }: Error) => message).join("\n"));
    }

    if (!data) {
      throw new Error("No data received from server introspection.");
    }

    this.schema = buildClientSchema(data);
    return this.schema;
  }
  onSchemaChange(
    _handler: NotificationHandler<GraphQLSchema>
  ): SchemaChangeUnsubscribeHandler {
    throw new Error("Polling of endpoint not implemented yet");
    return () => {};
  }
}
