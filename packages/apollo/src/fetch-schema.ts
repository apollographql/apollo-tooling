import { extractDocumentFromJavascript } from "apollo-codegen-core/lib/loading";
import { fs } from "apollo-codegen-core/lib/localfs";
import { execute as linkExecute, toPromise } from "apollo-link";
import { createHttpLink, HttpLink } from "apollo-link-http";
import {
  buildSchema,
  GraphQLSchema,
  getIntrospectionQuery,
  Source,
  ExecutionResult,
  graphql,
  IntrospectionSchema
} from "graphql";
import gql from "graphql-tag";
import { Agent, AgentOptions } from "https";
import fetch from "node-fetch";
import * as path from "path";
import { URL } from "url";
import { EndpointConfig } from "./config";
import { engineLink, getIdFromKey } from "./engine";
import { SCHEMA_QUERY } from "./operations/schema";

const introspection = gql(getIntrospectionQuery());

async function buildIntrospectionSchemaInLocalGraphQLContext(
  source: string | Source
): Promise<IntrospectionSchema> {
  const schema: GraphQLSchema = buildSchema(source);
  const executionResult: ExecutionResult = await graphql(
    schema,
    getIntrospectionQuery()
  );

  if (executionResult.errors) {
    console.error(executionResult.errors);
    throw new Error("No data received during introspection query execution.");
  }

  if (!executionResult.data) {
    throw new Error("No data received during introspection query execution.");
  }

  return executionResult.data.__schema;
}

function fromFile(file: string): Promise<IntrospectionSchema | undefined> {
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

      return schemaData;
    }

    if (ext === ".graphql" || ext === ".graphqls" || ext === ".gql") {
      return buildIntrospectionSchemaInLocalGraphQLContext(
        new Source(result, file)
      );
    }

    if (ext === ".ts" || ext === ".tsx" || ext === ".js" || ext === ".jsx") {
      return buildIntrospectionSchemaInLocalGraphQLContext(
        extractDocumentFromJavascript(result)!
      );
    }

    return Promise.resolve(undefined);
  } catch (e) {
    throw new Error(`Unable to read file ${file}. ${e.message}`);
  }
}

export const fetchSchema = async (
  { url, headers, skipSSLValidation }: EndpointConfig,
  projectFolder?: string
): Promise<IntrospectionSchema | undefined> => {
  if (!url) throw new Error("No endpoint provided when fetching schema");
  const filePath = projectFolder ? path.resolve(projectFolder, url) : url;
  if (fs.existsSync(filePath)) return fromFile(filePath);

  var options: HttpLink.Options = { uri: url, fetch };

  if (skipSSLValidation) {
    const urlObject = new URL(url);
    const host = urlObject.host;
    const port = +urlObject.port || 443;

    const agentOptions: AgentOptions = {
      host: host,
      port: port,
      rejectUnauthorized: false
    };

    const agent = new Agent(agentOptions);

    options.fetchOptions = { agent: agent };
  }

  const { data, errors }: any = await toPromise(
    linkExecute(createHttpLink(options), {
      query: introspection,
      context: { headers }
    })
  );

  if (!data) {
    throw new Error("No data received from server introspection.");
  }

  if (errors) {
    throw new Error(errors.map(({ message }: Error) => message).join("\n"));
  }

  return data.__schema;
};

export async function fetchSchemaFromEngine(
  apiKey: string,
  customEngine: string | undefined
): Promise<IntrospectionSchema | undefined> {
  const variables = {
    id: getIdFromKey(apiKey as string),
    tag: "current"
  };

  const engineSchema = await toPromise(
    linkExecute(engineLink, {
      query: SCHEMA_QUERY,
      variables,
      context: {
        headers: { ["x-api-key"]: apiKey },
        ...(customEngine && { uri: customEngine })
      }
    })
  );

  if (!engineSchema.data || !engineSchema.data.service.schema) {
    throw new Error("Unable to get schema from Apollo Engine");
  }

  return buildIntrospectionSchemaInLocalGraphQLContext(
    engineSchema.data.service.schema
  );
}
