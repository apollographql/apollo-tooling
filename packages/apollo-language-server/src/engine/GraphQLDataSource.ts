import { DataSourceConfig } from "apollo-datasource";
import request, { RequestOptions, ClientError } from "graphql-request";
import {
  ApolloError,
  AuthenticationError,
  ForbiddenError,
} from "apollo-server-errors";
import { GraphQLError } from "graphql";

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}
export class GraphQLDataSource<TContext = any> {
  public baseURL!: string;
  public context!: TContext;

  public initialize(config: DataSourceConfig<TContext>): void {
    this.context = config.context;
  }

  public async execute<T>(options: RequestOptions): Promise<T> {
    try {
      return request(
        this.resolveUri(),
        options.document,
        options.variables,
        options.requestHeaders
      );
    } catch (error: unknown) {
      if (error instanceof ClientError) {
        this.didEncounterError(error);
      }
      throw error;
    }
  }

  protected willSendRequest?(request: any): any;

  private didEncounterError(error: ClientError) {
    const status = error.response.status;
    const message =
      error.response.errors?.map((error) => error.message).join("\n") ??
      error.message ??
      null;

    let apolloError: ApolloError;

    switch (status) {
      case 401:
        apolloError = new AuthenticationError(message);
        break;
      case 403:
        apolloError = new ForbiddenError(message);
        break;
      default:
        apolloError = new ApolloError(message);
    }

    throw apolloError;
  }

  private resolveUri(): string {
    const baseURL = this.baseURL;

    if (!baseURL) {
      throw new ApolloError(
        "Cannot make request to GraphQL API, missing baseURL"
      );
    }

    return baseURL;
  }
}
