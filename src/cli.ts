#!/usr/bin/env node

import * as process from 'process';
import * as path from 'path';
import * as yargs from 'yargs';

import { downloadSchema, generate } from '.';
import { ToolError, logError } from './errors'

import 'source-map-support/register'

export type targetChoices = 'swift' | 'json' | 'ts' | 'typescript';

export interface Options {
  passthroughCustomScalars: boolean;
}

// Make sure unhandled errors in async code are propagated correctly
process.on('unhandledRejection', (error: Error) => { throw error });

process.on('uncaughtException', handleError);

function handleError(error: Error) {
  logError(error);
  process.exit(1);
}

yargs
  .command(
    'download-schema <server>',
    'Download a GraphQL schema from a server',
    {
      output: {
        demand: true,
        describe: 'Output path for GraphQL schema file',
        default: 'schema.json',
        normalize: true,
        coerce: path.resolve,
      } as yargs.Options,
      header: {
        alias: 'H',
        describe: 'Additional header to send to the server as part of the introspection query request',
        type: 'array',
        coerce: (arg) => {
          let additionalHeaders: {[key: string]: string} = {};
          for (const header of arg) {
            const [name, value] = (header as string).split(/\s*:\s*/);
            if (!(name && value)) {
              throw new ToolError('Headers should be specified as "Name: Value"');
            }
            additionalHeaders[name] = value;
          }
          return additionalHeaders;
        }
      } as yargs.Options,
    },
    async argv => {
      const outputPath = path.resolve(argv.output);
      const additionalHeaders = argv.header;
      await downloadSchema(argv.server as string, outputPath as string, additionalHeaders as {[key: string]: string});
    }
  )
  .command(
    'generate [input...]',
    'Generate code from a GraphQL schema and query documents',
    {
      schema: {
        demand: true,
        describe: 'Path to GraphQL schema file',
        default: 'schema.json',
        normalize: true,
        coerce: path.resolve,
      },
      output: {
        describe: 'Output directory for the generated files',
        normalize: true,
        coerce: path.resolve,
      },
      target: {
        demand: false,
        describe: 'Code generation target language',
        choices: ['swift', 'json', 'ts', 'typescript'],
        default: 'swift'
      },
      "passthrough-custom-scalars": {
        demand: false,
        describe: "Don't attempt to map custom scalars [temporary option]",
        default: false
      }
    },
    argv => {
      const inputPaths: string[] = argv.input.map((input: string) => path.resolve(input));
      const options: Options = { passthroughCustomScalars: argv["passthrough-custom-scalars"] };
      generate(inputPaths, argv.schema as string, argv.output as string, argv.target as targetChoices, options);
    },
  )
  .fail(function(message, error) {
    handleError(error ? error : new ToolError(message));
  })
  .help()
  .version(() => require('../package').version) // needs to fix yargs typings to take plain version()
  .strict()
  .argv
