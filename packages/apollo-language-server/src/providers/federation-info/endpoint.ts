// IntrospectionSchemaProvider (http => IntrospectionResult => schema)
// import { NotificationHandler } from "vscode-languageserver";
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
import { Agent } from "http";
import { fetch } from "apollo-env";
import { RemoteServiceConfig } from "../../config";
import {
  // GraphQLSchemaProvider,
  // SchemaChangeUnsubscribeHandler
  GraphQLFederationInfoProvider,
  FederationInfo
} from "./base";

export class EndpointFederationInfoProvider
  implements GraphQLFederationInfoProvider {
  private info?: FederationInfo;

  constructor(private config: Exclude<RemoteServiceConfig, "name">) {}

  private async getFederationInfo() {
    const { skipSSLValidation, url, headers } = this.config;
    const options: HttpLink.Options = {
      uri: url,
      fetch,
      ...(skipSSLValidation && { fetchOptions: { agent: new Agent() } })
    };

    const getFederationInfoQuery = `
      query getFederationInfo {
        _service {
          sdl
          name
          url
        }
      }
    `;

    // TODO: fix return type
    const { data, errors } = (await toPromise(
      linkExecute(createHttpLink(options), {
        query: parse(getFederationInfoQuery),
        context: { headers }
      })
    )) as any;
    // as ExecutionResult<IntrospectionQuery>;

    if (errors && errors.length) {
      // XXX better error handling of GraphQL errors
      throw new Error(errors.map(({ message }: Error) => message).join("\n"));
    }

    if (!data || !data._service) {
      throw new Error(
        "No data received from server when querying for _service."
      );
    }

    this.info = data._service;
  }

  async resolveFederationInfo() {
    if (!this.info) await this.getFederationInfo();

    if (!this.info) throw new Error("No service info available");

    return this.info;
  }

  // onSchemaChange(
  //   _handler: NotificationHandler<GraphQLSchema>
  // ): SchemaChangeUnsubscribeHandler {
  //   throw new Error("Polling of endpoint not implemented yet");
  //   return () => {};
  // }
}
