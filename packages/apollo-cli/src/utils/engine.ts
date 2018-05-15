import { createHttpLink } from "apollo-link-http";
import fetch from "node-fetch";

export const getIdFromKey = (key: string) => key.split(":")[1];
export const ENGINE_URI = "https://schema-registry-current.glitch.me/";
export const engineLink = createHttpLink({ uri: ENGINE_URI, fetch });
