#!/usr/bin/env node

import process from 'process';
import path from 'path';
import yargs from 'yargs';

import { downloadSchema, generate } from '.';
import { ToolError, logError } from './errors'

import 'source-map-support/register'

// Make sure unhandled errors in async code are propagated correctly
process.on('unhandledRejection', (error) => { throw error });

process.on('uncaughtException', handleError);

function handleError(error) {
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
      },
      header: {
        alias: 'H',
        describe: 'Additional header to send to the server as part of the introspection query request',
        type: 'array',
        coerce: (arg) => {
          let additionalHeaders = {};
          for (const header of arg) {
            const [name, value] = header.split(/\s*:\s*/);
            if (!(name && value)) {
              throw new ToolError('Headers should be specified as "Name: Value"');
            }
            additionalHeaders[name] = value;
          }
          return additionalHeaders;
        }
      },
    },
    async argv => {
      const outputPath = path.resolve(argv.output);
      const additionalHeaders = argv.header;
      await downloadSchema(argv.server, outputPath, additionalHeaders);
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
        choices: ['swift', 'json'],
        default: 'swift'
      },
      "passthrough-custom-scalars": {
        demand: false,
        describe: "Don't attempt to map custom scalars [temporary option]",
        default: false
      }
    },
    argv => {
      const inputPaths = argv.input.map(input => path.resolve(input));
      const options = { passthroughCustomScalars: argv["passthrough-custom-scalars"] };
      generate(inputPaths, argv.schema, argv.output, argv.target, options);
    },
  )
  .fail(function(message, error) {
    handleError(error ? error : new ToolError(message));
  })
  .help()
  .version()
  .strict()
  .argv
