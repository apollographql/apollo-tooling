import { ApolloConfig } from "./config";
import { fromFile, fetchSchema, fetchSchemaFromEngine } from "./fetch-schema";

export async function loadSchema(config: ApolloConfig) {
  if (config.schema) {
    return await fromFile(config.schema);
  } else if (config.endpoint) {
    return await fetchSchema(config.endpoint);
  } else if (config.engineKey) {
    return await fetchSchemaFromEngine(config.engineKey);
  } else {
    throw new Error("No methods of getting the schema found");
  }
}

export function loadSchemaStep(
  pullFromEngine: boolean,
  apiKey: string | undefined,
  notEngineTitle: string,
  notEngine: (ctx: any) => Promise<void>
) {
  return {
    title: pullFromEngine
      ? "Loading schema from Apollo Engine"
      : notEngineTitle,
    task: async (ctx: any) => {
      if (pullFromEngine) {
        ctx.schema = await fetchSchemaFromEngine(apiKey as string);
      } else {
        await notEngine(ctx);
      }
    }
  };
}
