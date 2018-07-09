import { fs } from "apollo-codegen-core/lib/localfs";
import * as path from "path";
import fetch from "node-fetch";
import gql from "graphql-tag";
import {
  ExecutionResult,
  buildSchema,
  execute as graphql,
  introspectionQuery,
} from "graphql";
import { execute, toPromise } from "apollo-link";
import { createHttpLink } from "apollo-link-http";

const introspection = gql(introspectionQuery);

export const fromFile = async ({ endpoint }: { endpoint: string }) => {
  try {
    const result = fs.readFileSync(endpoint, {
      encoding: "utf-8",
    });
    const ext = path.extname(endpoint);

    // an actual introspectionQuery result
    if (ext === ".json") return JSON.parse(result).data.__schema;

    if (ext === ".graphql" || ext === ".graphqls" || ext === ".gql") {
      const schema = buildSchema(result);
      const localSchema = await graphql(schema, introspection);
      if (!localSchema || localSchema.errors)
        throw new Error(
          localSchema.errors!.map(({ message }) => message).join("\n")
        );
      return localSchema.data!.__schema;
    }
  } catch (e) {
    throw new Error(`Unable to read file ${endpoint}. ${e.message}`);
  }
};

export interface FetchParams {
  endpoint: string | undefined;
  header?: Object[];
}

export const fetchSchema = async ({ endpoint, header }: FetchParams) => {
  if (!endpoint) throw new Error("No endpoint provided when fetching schema");
  if (fs.existsSync(endpoint)) return fromFile({ endpoint });

  const headers = header
    ? header.reduce((current, next) => ({ ...current, ...next }), {})
    : {};

  return toPromise(
    // XXX node-fetch isn't compatiable typescript wise here?
    execute(createHttpLink({ uri: endpoint, fetch } as any), {
      query: introspection,
      context: { headers },
    })
  ).then(({ data, errors }: any) => {
    if (errors)
      throw new Error(errors.map(({ message }: Error) => message).join("\n"));
    return data!.__schema;
  });
};
