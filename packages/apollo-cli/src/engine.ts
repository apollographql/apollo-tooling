import { createHttpLink } from "apollo-link-http";
import fetch from "node-fetch";
import { ApolloLink } from "apollo-link";

export { ApolloLink };
export const getIdFromKey = (key: string) => key.split(":")[1];
export const ENGINE_URI = "https://schema-registry-current.glitch.me/";
// XXX looks like node-fetch isn't compatiable typing wise here?
export const engineLink = createHttpLink({
  uri: ENGINE_URI,
  fetch,
} as any);
