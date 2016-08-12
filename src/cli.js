#!/usr/bin/env node

import path from 'path';
import yargs from 'yargs';

import { downloadSchema, generate } from '.';

yargs
  .command(
    'download-schema <server>',
    'Download a GraphQL schema from a server',
    {
      output: {
        demand: true,
        describe: 'Output path for GraphQL schema file',
        normalize: true
      }
    },
    async argv => {
      const outputPath = path.resolve(argv.output);
      try {
        await downloadSchema(argv.server, outputPath);
      } catch (error) {
        console.error(error);
      }
    }
  )
  .command(
    'generate <input...>',
    'Generate code from a GraphQL schema and query documents',
    {
      schema: {
        demand: true,
        describe: 'Path to GraphQL schema file',
        normalize: true
      },
      output: {
        demand: true,
        describe: 'Output directory for the generated files',
        normalize: true
      }
    },
    argv => {
      try {
        const inputPaths = argv.input.map(input => path.resolve(input));
        const schemaPath = path.resolve(argv.schema);
        const outputPath = path.resolve(argv.output);
        generate(inputPaths, schemaPath, outputPath);
      } catch (error) {
        console.error(error.stack);
      }
    },
  )
  .showHelpOnFail(false)
  .help()
  .strict()
  .argv
