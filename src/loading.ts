import * as fs from 'fs'

import {
  buildClientSchema,
  Source,
  concatAST,
  parse,
  DocumentNode,
  GraphQLSchema
} from 'graphql';

import {
  getGraphQLProjectConfig,
  ConfigNotFoundError
} from 'graphql-config'

import { ToolError } from './errors'

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

export function loadSchemaFromConfig(projectName: string): GraphQLSchema {
  try {
    const config = getGraphQLProjectConfig('.', projectName);
    return config.getSchema();
  } catch (e) {
    if (!(e instanceof ConfigNotFoundError)) {
      throw e;
    }
  }

  const defaultSchemaPath = 'schema.json';

  if (fs.existsSync(defaultSchemaPath)) {
    return loadSchema('schema.json');
  }

  throw new ToolError(`No GraphQL schema specified. There must either be a .graphqlconfig or a ${defaultSchemaPath} file present, or you must use the --schema option.`);
}

function extractDocumentFromJavascript(content: string, tagName: string = 'gql'): string | null {
  const re = new RegExp(tagName + '\\s*`([^`/]*)`', 'g');

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

export function loadAndMergeQueryDocuments(inputPaths: string[], tagName: string = 'gql'): DocumentNode {
  const sources = inputPaths.map(inputPath => {
    const body = fs.readFileSync(inputPath, 'utf8');
    if (!body) {
      return null;
    }

    if (inputPath.endsWith('.jsx') || inputPath.endsWith('.js')
      || inputPath.endsWith('.tsx') || inputPath.endsWith('.ts')
    ) {
      const doc = extractDocumentFromJavascript(body.toString(), tagName);
      return doc ? new Source(doc, inputPath) : null;
    }

    return new Source(body, inputPath);
  }).filter(source => source);

  return concatAST((sources as Source[]).map(source => parse(source)));
}
