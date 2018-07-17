import { loadConfigFromFile, findAndLoadConfig } from './config';
import { ListrTask } from 'listr';

export function loadConfigStep(error: (msg: string) => void, flags: any, engineRequired: boolean): ListrTask {
  const header: any[] = Array.isArray(flags.header) ? flags.header : [flags.header];
  const task = {
    title: "Loading Apollo config",
    task: async (ctx: any) => {
      if (flags.config) {
        ctx.config = loadConfigFromFile(flags.config);
      } else {
        ctx.config = findAndLoadConfig();
      }

      ctx.config = {
        ...ctx.config,
        endpoint: {
          ...ctx.config.endpoint,
          ...(flags.endpoint && { url: flags.endpoint }),
          ...(header.length > 0 && { headers: (header
            .filter(x => !!x)
            .map(x => JSON.parse(x))
            .reduce((a, b) => Object.assign(a, b), {})) })
        },
        ...(flags.key && { engineKey: flags.key }),
        ...(flags.queries && { operations: flags.queries.split("\n") })
      };

      if (!ctx.config.engineKey && engineRequired) {
        error(
          "No API key was specified. Set an Apollo Engine API key using the `--key` flag or the `ENGINE_API_KEY` environment variable."
        );
        return;
      }
    }
  };

  return task;
}
