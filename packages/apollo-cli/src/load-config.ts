import {
  loadConfigFromFile,
  findAndLoadConfig,
  SchemaDependency
} from "./config";
import { ListrTask } from "listr";

export function loadConfigStep(
  flags: any,
  defaultEndpoint: boolean = true
): ListrTask {
  const header: any[] = Array.isArray(flags.header)
    ? flags.header
    : [flags.header];
  const task = {
    title: "Loading Apollo config",
    task: async (ctx: any) => {
      if (flags.config) {
        ctx.config = loadConfigFromFile(
          flags.config,
          defaultEndpoint,
          !flags.clientSchema
        );
      } else {
        ctx.config = findAndLoadConfig(
          process.cwd(),
          defaultEndpoint,
          !flags.clientSchema
        );
      }

      if (flags.schema || flags.endpoint) {
        ctx.config.schemas = {
          default: {
            schema: flags.schema,
            endpoint: flags.endpoint && {
              url: flags.endpoint,
              ...(header.length > 0 && {
                headers: header
                  .filter(x => !!x)
                  .map(x => JSON.parse(x))
                  .reduce((a, b) => Object.assign(a, b), {})
              })
            }
          }
        };
      }

      if (flags.clientSchema) {
        const extendsName = ctx.config.schemas.default
          ? "serverSchema"
          : undefined;
        ctx.config.schemas.serverSchema = ctx.config.schemas.default;

        ctx.config.schemas.default = {
          extends: extendsName,
          schema: flags.clientSchema,
          clientSide: true
        };
      }

      if (!ctx.config.queries || ctx.config.queries.length == 0 && flags.queries) {
        ctx.config.queries = [
          {
            schema: "default",
            includes: flags.queries.split("\n"),
            excludes: []
          }
        ];
      }
      else if (flags.queries && flags.queries != '**/*.graphql') {
        ctx.config.queries = ctx.config.queries.map((query: any) => {
          return Object.assign({}, query, {
            includes: flags.queries.split("\n")
          })
        })
      }

      if (flags.key) {
        if (Object.keys(ctx.config.schemas).length == 1) {
          (Object.values(ctx.config.schemas)[0] as SchemaDependency).engineKey =
            flags.key;
        }
      }

      if (flags.engine) {
        ctx.config.engineEndpoint = flags.engine;
      }

      if (ctx.config.queries.length == 0 && ctx.config.schemas.default) {
        ctx.config.queries.push({
          schema: "default",
          includes: ["**/*.graphql"],
          excludes: []
        });
      }
    }
  };

  return task;
}
