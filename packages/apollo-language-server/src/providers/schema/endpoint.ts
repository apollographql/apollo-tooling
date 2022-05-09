// IntrospectionSchemaProvider (http => IntrospectionResult => schema)
import { NotificationHandler } from "vscode-languageserver";
import request, { ClientError } from "graphql-request";
import {
  GraphQLSchema,
  buildClientSchema,
  getIntrospectionQuery,
  ExecutionResult,
  IntrospectionQuery,
  parse,
} from "graphql";
import { Agent as HTTPSAgent } from "https";
import { RemoteServiceConfig, DefaultServiceConfig } from "../../config";
import { GraphQLSchemaProvider, SchemaChangeUnsubscribeHandler } from "./base";
import { Debug } from "../../utilities";
import { isString } from "util";

export class EndpointSchemaProvider implements GraphQLSchemaProvider {
  private schema?: GraphQLSchema;
  private federatedServiceSDL?: string;

  constructor(private config: Exclude<RemoteServiceConfig, "name">) {}

  async resolveSchema() {
    if (this.schema) return this.schema;
    // FIXME
    const { /* skipSSLValidation */ url, headers } = this.config;

    // if (url.startsWith("https:") && skipSSLValidation) {
    //   options.fetchOptions = {
    //     agent: new HTTPSAgent({ rejectUnauthorized: false }),
    //   };
    // }
    let result: IntrospectionQuery;
    try {
      result = await request<IntrospectionQuery>(url, getIntrospectionQuery(), {}, headers);
    } catch (error: unknown) {
      if (error instanceof ClientError) {
        if (error.response.errors) {
          throw new Error(
            error.response.errors.map(({ message }) => message).join("\n")
          );
        }
      }

      if (error instanceof Error) {
        // html response from introspection
        if (isString(error.message) && error.message.includes("token <")) {
          throw new Error(
            "Apollo tried to introspect a running GraphQL service at " +
              url +
              "\nIt expected a JSON schema introspection result, but got an HTML response instead." +
              "\nYou may need to add headers to your request or adjust your endpoint url.\n" +
              "-----------------------------\n" +
              "For more information, please refer to: https://go.apollo.dev/t/config \n\n" +
              "The following error occurred:\n-----------------------------\n" +
              error.message
          );
        }

        // 404 encountered with the default url
        if (
          url === DefaultServiceConfig.endpoint.url &&
          isString(error.message) &&
          error.message.includes("ECONNREFUSED")
        ) {
          throw new Error(
            "Failed to connect to a running GraphQL endpoint at " +
              url +
              "\nThis may be because you didn't start your service.\n" +
              "By default, when an endpoint, Apollo API key, or localSchemaFile isn't provided, Apollo tries to fetch a schema from " +
              DefaultServiceConfig.endpoint.url +
              "\n-----------------------------\n" +
              "\nFor more information, please refer to: https://go.apollo.dev/t/config \n\n" +
              "The following error occurred: \n" +
              "-----------------------------\n" +
              error.message
          );
        }
        // 404 with a non-default url
        if (isString(error.message) && error.message.includes("ECONNREFUSED")) {
          throw new Error(
            "Failed to connect to a running GraphQL endpoint at " +
              url +
              "\nThis may be because you didn't start your service or the endpoint URL is incorrect."
          );
        }
      }
      throw error;
    }

    if (!result) {
      throw new Error("No data received from server introspection.");
    }

    this.schema = buildClientSchema(result);
    return this.schema;
  }

  onSchemaChange(
    _handler: NotificationHandler<GraphQLSchema>
  ): SchemaChangeUnsubscribeHandler {
    throw new Error("Polling of endpoint not implemented yet");
  }

  async resolveFederatedServiceSDL() {
    if (this.federatedServiceSDL) return this.federatedServiceSDL;

    // FIXME
    const { /*skipSSLValidation,*/ url, headers } = this.config;
    // if (url.startsWith("https:") && skipSSLValidation) {
    //   options.fetchOptions = {
    //     agent: new HTTPSAgent({ rejectUnauthorized: false }),
    //   };
    // }

    const getFederationInfoQuery = `
      query getFederationInfo {
        _service {
          sdl
        }
      }
    `;

    try {
      const result = await request<{ _service: { sdl: string } }>(url, getFederationInfoQuery, {}, headers);
      if (!result || !result._service) {
        return Debug.error(
          "No data received from server when querying for _service."
        );
      }
      this.federatedServiceSDL = result._service.sdl;
      return result._service.sdl;
    } catch (error: unknown) {
      if (error instanceof ClientError) {
        if (error.response.errors?.length) {
          return Debug.error(
            error.response.errors.map(({ message }) => message).join("\n")
          );
        }
      }
      throw error;
    }
  }

  // public async isFederatedSchema() {
  //   const schema = this.schema || (await this.resolveSchema());
  //   return false;
  // }
}
