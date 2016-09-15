#!/usr/bin/env node

import process from 'process';
import path from 'path';
import yargs from 'yargs';

import { GraphQLError } from 'graphql';

import { downloadSchema, generate } from '.';
import logGraphQLError from './logGraphQLError'

// Make sure unhandled errors in async code are propagated correctly
process.on('unhandledRejection', (error) => { throw error });

process.on('uncaughtException', handleError);

function handleError(error) {
  if (error instanceof GraphQLError) {
    logGraphQLError(error);
  } else {
    console.log(error.stack);
  }
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
        normalize: true
      }
    },
    async argv => {
      const outputPath = path.resolve(argv.output);
      await downloadSchema(argv.server, outputPath);
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
      const inputPaths = argv.input.map(input => path.resolve(input));
      const schemaPath = path.resolve(argv.schema);
      const outputPath = path.resolve(argv.output);
      generate(inputPaths, schemaPath, outputPath);
    },
  )
  .fail(function(message, error) {
    handleError(error ? error : new Error(message));
  })
  .help()
  .strict()
  .argv
