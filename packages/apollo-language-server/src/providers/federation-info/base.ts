// import { GraphQLSchema } from "graphql";
// import { NotificationHandler } from "vscode-languageserver";

// export interface SchemaResolveConfig {
//   tag?: string;
//   force?: boolean;
// }

// export type SchemaChangeUnsubscribeHandler = () => void;

export interface FederationInfo {
  sdl?: string;
  name?: string;
  url?: string;
}

export interface ApolloFederationInfoProvider {
  resolveFederationInfo(): Promise<FederationInfo>;
  // onSchemaChange(
  //   handler: NotificationHandler<string>
  // ): SchemaChangeUnsubscribeHandler;
}
