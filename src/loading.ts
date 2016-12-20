import * as path from 'path'
import * as fs from 'fs'

import {
  buildClientSchema,
  Source,
  concatAST,
  parse,
  DocumentNode,
} from 'graphql';

import { ToolError, logError } from './errors'

export function loadSchema(schemaPath: string) {
  if (!fs.existsSync(schemaPath)) {
    throw new ToolError(`Cannot find GraphQL schema file: ${schemaPath}`);
  }
  const schemaData = require(schemaPath);

  if (!schemaData.data && !schemaData.__schema) {
    throw new ToolError('GraphQL schema file should contain a valid GraphQL introspection query result');
  }
  return buildClientSchema((schemaData.data) ? schemaData.data : schemaData);
}

export function loadAndMergeQueryDocuments(inputPaths: string[]): DocumentNode {
  const sources = inputPaths.map(inputPath => {
    const body = fs.readFileSync(inputPath, 'utf8')
    if (!body) {
      return null;
    }
    return new Source(body, inputPath);
  }).filter(source => source) as Source[];

  return concatAST(sources.map(source => parse(source)));
}
