import * as fs from 'fs';
import { loadSchema, loadAndMergeQueryDocuments } from './loading'

import { buildASTSchema, extendSchema, graphql, parse } from 'graphql';
import { Kind } from 'graphql/language';
import { introspectionQuery } from 'graphql/utilities';

import { ToolError } from './errors'

export async function introspect(schemaContents) {
  let schema = buildASTSchema(schemaContents);
  const extensionDefs = schemaContents.definitions.filter((def) => def.kind === Kind.TYPE_EXTENSION_DEFINITION);
  if( extensionDefs.length > 0 )
    schema = extendSchema(schema, {...schemaContents, definitions:extensionDefs});

  return await graphql(schema, introspectionQuery);
}

export default async function introspectSchema(schemaPaths, outputPath) {
  let schemaContents;
  if( schemaPaths.length === 1 ) {
    if (!fs.existsSync(schemaPaths[0])) {
      throw new ToolError(`Cannot find GraphQL schema file: ${schemaPaths[0]}`);
    }
    schemaContents = parse(fs.readFileSync(schemaPaths[0]).toString());
  }
  else {
    schemaContents = loadAndMergeQueryDocuments(schemaPaths, 'gql');
  }

  const result = await introspect(schemaContents);

  if (result.errors) {
    throw new ToolError(`Errors in introspection query result: ${result.errors}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
}
