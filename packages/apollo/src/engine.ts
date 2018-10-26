import { createHttpLink } from "apollo-link-http";
import fetch from "node-fetch";
import { ApolloLink, from } from "apollo-link";

export { ApolloLink };
export const getIdFromKey = (key: string) => key.split(":")[1];
export const ENGINE_URI =
  "https://engine-graphql.apollographql.com/api/graphql/";

const clientIdentification = new ApolloLink((operation, forward) => {
  operation.extensions.clientInfo = {
    clientName: "apollo-cli",
    clientId: "apollo-cli",
    clientVersion: require("../package.json").version
  };
  operation.setContext({
    http: {
      includeExtensions: true
    }
  });
  return forward!(operation);
});

// XXX looks like node-fetch isn't compatiable typing wise here?
export const engineLink = from([
  clientIdentification,
  createHttpLink({
    uri: ENGINE_URI,
    fetch
  } as any)
]);
