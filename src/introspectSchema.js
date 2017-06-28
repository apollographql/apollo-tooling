import * as fs from 'fs';

import { buildASTSchema, graphql, parse } from 'graphql';
import { introspectionQuery } from 'graphql/utilities';

import { ToolError } from './errors'

export async function introspect(schemaContents) {
  const schema = buildASTSchema(parse(schemaContents));
  return await graphql(schema, introspectionQuery);
}

export default async function introspectSchema(schemaPath, outputPath) {
  if (!fs.existsSync(schemaPath)) {
    throw new ToolError(`Cannot find GraphQL schema file: ${schemaPath}`);
  }

  const schemaContents = fs.readFileSync(schemaPath).toString();
  const result = await introspect(schemaContents);

  if (result.errors) {
    throw new ToolError(`Errors in introspection query result: ${result.errors}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
}
