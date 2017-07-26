import * as path from 'path'
import * as fs from 'fs'
import * as mkdirp from 'mkdirp'

import {
  buildClientSchema,
  Source,
  concatAST,
  parse,
  DocumentNode,
  GraphQLSchema
} from 'graphql';

import { ToolError, logError } from './errors'

export function loadSchema(schemaPath: string): GraphQLSchema {
  if (!fs.existsSync(schemaPath)) {
    throw new ToolError(`Cannot find GraphQL schema file: ${schemaPath}`);
  }
  const schemaData = require(schemaPath);

  if (!schemaData.data && !schemaData.__schema) {
    throw new ToolError('GraphQL schema file should contain a valid GraphQL introspection query result');
  }
  return buildClientSchema((schemaData.data) ? schemaData.data : schemaData);
}

function extractDocumentFromJavascript(content: string, tagName: string = 'gql'): string | null {
  const re = new RegExp(tagName + '`([^`]*)`', 'g');

  let match
  const matches = []

  while(match = re.exec(content)) {
    const doc = match[1]
      .replace(/\${[^}]*}/g, '')

    matches.push(doc)
  }

  const doc = matches.join('\n')
  return doc.length ? doc : null;
}

export function loadAndMergeQueryDocuments(inputPaths: string[], tagName: string): DocumentNode {
  const sources = inputPaths.map(inputPath => {
    const body = fs.readFileSync(inputPath, 'utf8');
    if (!body) {
      return null;
    }

    if (inputPath.endsWith('.jsx') || inputPath.endsWith('.js')
      || inputPath.endsWith('.tsx') || inputPath.endsWith('.ts')
    ) {
      const doc = extractDocumentFromJavascript(body.toString(), tagName);
      if (doc) {
        if (doc.trim().indexOf('mutation') === 0) {
          return null;
        }

        return new Source(doc, inputPath);
      } else {
        return null;
      }
    }

    if (body.trim().indexOf('mutation') === 0) {
      return null;
    }

    return new Source(body, inputPath);
  }).filter(source => source);

  return concatAST((sources as Source[]).map(source => parse(source)));
}
