import { Command } from "@oclif/command";
import { engineLink, getIdFromKey } from "./engine";
import { toPromise, execute } from "apollo-link";
import { SCHEMA_QUERY } from "./operations/schema";

export function loadSchemaStep(
  self: Command,
  pullFromEngine: boolean,
  apiKey: string | undefined,
  engineFlag: string | undefined,
  notEngineTitle: string,
  notEngine: (ctx: any) => Promise<void>
) {
  return {
    title: pullFromEngine
      ? "Loading schema from Apollo Engine"
      : notEngineTitle,
    task: async (ctx: any) => {
      if (pullFromEngine) {
        const variables = {
          id: getIdFromKey(apiKey as string),
          tag: "current",
        };

        const engineSchema = await toPromise(
          execute(engineLink, {
            query: SCHEMA_QUERY,
            variables,
            context: {
              headers: { ["x-api-key"]: apiKey },
              ...(engineFlag && { uri: engineFlag }),
            },
          })
        );

        if (engineSchema.data && engineSchema.data.service.schema) {
          ctx.schema = engineSchema.data.service.schema.__schema;
        } else {
          self.error("Failed to get schema from Apollo Engine");
        }
      } else {
        await notEngine(ctx);
      }
    },
  };
}
