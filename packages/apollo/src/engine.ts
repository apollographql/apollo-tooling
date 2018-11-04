import { createHttpLink } from "apollo-link-http";
import { fetch } from "apollo-env";
import { ApolloLink } from "apollo-link";

export { ApolloLink };
export const getIdFromKey = (key: string) => key.split(":")[1];
export const ENGINE_URI =
  "https://engine-graphql.apollographql.com/api/graphql/";

export const engineLink = createHttpLink({
  uri: ENGINE_URI,
  fetch
});
