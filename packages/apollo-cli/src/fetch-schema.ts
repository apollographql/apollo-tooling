import { extractDocumentFromJavascript } from "apollo-codegen-core/lib/loading";
import { fs } from "apollo-codegen-core/lib/localfs";
import { execute, toPromise } from "apollo-link";
import { createHttpLink, HttpLink } from "apollo-link-http";
import { buildClientSchema, buildSchema, GraphQLSchema, introspectionQuery, Source } from "graphql";
import gql from "graphql-tag";
import { Agent, AgentOptions } from 'https';
import fetch from "node-fetch";
import * as path from "path";
import { URL } from 'url';
import { EndpointConfig } from "./config";
import { engineLink, getIdFromKey } from "./engine";
import { SCHEMA_QUERY } from "./operations/schema";

const introspection = gql(introspectionQuery);

export async function fromFile(
  file: string
): Promise<GraphQLSchema | undefined> {
  try {
    const result = fs.readFileSync(file, {
      encoding: "utf-8"
    });
    const ext = path.extname(file);

    // an actual introspectionQuery result
    if (ext === ".json") {
      const parsed = JSON.parse(result);
      const schemaData = parsed.data
        ? parsed.data.__schema
        : parsed.__schema
          ? parsed.__schema
          : parsed;

      return buildClientSchema({ __schema: schemaData });
    }

    if (ext === ".graphql" || ext === ".graphqls" || ext === ".gql") {
      return buildSchema(new Source(result, file));
    }

    if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx") {
      return await buildSchema(extractDocumentFromJavascript(result)!);
    }

    return undefined;
  } catch (e) {
    throw new Error(`Unable to read file ${file}. ${e.message}`);
  }
}

export const fetchSchema = async (
  { url, headers }: EndpointConfig,
  projectFolder?: string,
  insecureEnabled?: boolean
): Promise<GraphQLSchema | undefined> => {
  if (!url) throw new Error("No endpoint provided when fetching schema");
  const filePath = projectFolder ? path.resolve(projectFolder, url) : url;
  if (fs.existsSync(filePath)) return fromFile(filePath);

  const insecureOptionActive = insecureEnabled ? insecureEnabled : false;

  var options: HttpLink.Options = { uri: url, fetch }

  if (insecureOptionActive) {
    const host = new URL(url).host

    const agentOptions: AgentOptions = {
      host: host,
      port: 443,
      rejectUnauthorized: false
    };

    const agent = new Agent(agentOptions);

    options.fetchOptions = { agent: agent }
  }

  return toPromise(

    // XXX node-fetch isn't compatible typescript wise here?
    execute(createHttpLink(options), {
      query: introspection,
      context: { headers }
    })
  ).then(({ data, errors }: any) => {
    if (errors)
      throw new Error(errors.map(({ message }: Error) => message).join("\n"));
    return buildClientSchema({ __schema: data.__schema });
  });
};

export async function fetchSchemaFromEngine(
  apiKey: string,
  customEngine: string | undefined
): Promise<GraphQLSchema | undefined> {
  const variables = {
    id: getIdFromKey(apiKey as string),
    tag: "current"
  };

  const engineSchema = await toPromise(
    execute(engineLink, {
      query: SCHEMA_QUERY,
      variables,
      context: {
        headers: { ["x-api-key"]: apiKey },
        ...(customEngine && { uri: customEngine })
      }
    })
  );

  if (engineSchema.data && engineSchema.data.service.schema) {
    return buildClientSchema(engineSchema.data.service.schema);
  } else {
    throw new Error("Unable to get schema from Apollo Engine");
  }
}
