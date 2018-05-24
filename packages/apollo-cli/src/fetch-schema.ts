import * as fs from "fs";
import * as path from "path";
import fetch from "node-fetch";
import {
  buildSchema,
  execute as graphql,
  parse,
  introspectionQuery,
} from "graphql";
import { execute, toPromise } from "apollo-link";
import { createHttpLink } from "apollo-link-http";

const fromFile = ({ endpoint }) => {
  try {
    const result = fs.readFileSync(endpoint, {
      encoding: "utf-8",
    });
    const ext = path.extname(endpoint);

    // an actual introspectionQuery result
    if (ext === ".json") return JSON.parse(result).data.__schema;

    if (ext === ".graphql" || ext === ".graphqls" || ext === ".gql") {
      const schema = buildSchema(result);
      const localSchema = graphql(schema, parse(introspectionQuery));
      return localSchema.data.__schema;
    }
  } catch (e) {
    throw new Error(`Unable to read file ${flags.endpoint}. ${e.message}`);
  }
};

export const fetchSchema = async ({ endpoint, header }) => {
  if (fs.existsSync(endpoint)) return fromFile({ endpoint });

  // XXX handle errors in finding schema
  const headers = header
    ? header.reduce((current, next) => ({ ...current, ...next }), {})
    : {};

  return toPromise(
    execute(createHttpLink({ uri: endpoint, fetch }), {
      query: parse(introspectionQuery),
      context: { headers },
    })
  ).then(({ data, errors }) => {
    if (errors) throw new Error(errors);
    return data.__schema;
  });
};
