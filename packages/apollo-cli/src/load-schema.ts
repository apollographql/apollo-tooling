import { ApolloConfig } from "./config";
import { fromFile, fetchSchema, fetchSchemaFromEngine } from "./fetch-schema";

export async function loadSchema(config: ApolloConfig) {
  if (config.schema) {
    return await fromFile(config.schema);
  } else if (config.endpoint && config.endpoint.url) {
    return await fetchSchema(config.endpoint);
  } else if (config.engineKey) {
    return await fetchSchemaFromEngine(config.engineKey, undefined);
  } else {
    return undefined;
  }
}

export function loadSchemaStep(
  pullFromEngine: boolean,
  apiKey: string | undefined,
  customEngine: string | undefined,
  notEngineTitle: string,
  notEngine: (ctx: any) => Promise<void>
) {
  return {
    title: pullFromEngine
      ? "Loading schema from Apollo Engine"
      : notEngineTitle,
    task: async (ctx: any) => {
      if (pullFromEngine) {
        ctx.schema = await fetchSchemaFromEngine(
          apiKey as string,
          customEngine
        );
      } else {
        await notEngine(ctx);
      }
    }
  };
}
