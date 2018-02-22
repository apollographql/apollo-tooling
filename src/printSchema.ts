import * as fs from 'fs';

import { buildClientSchema, printSchema } from 'graphql';

import { ToolError } from './errors'
import { PrinterOptions } from 'graphql/utilities/schemaPrinter';

export default async function printSchemaFromIntrospectionResult(
  schemaPath: string,
  outputPath: string,
  options?: PrinterOptions
) {
  if (!fs.existsSync(schemaPath)) {
    throw new ToolError(`Cannot find GraphQL schema file: ${schemaPath}`);
  }

  const schemaJSON = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  if (!schemaJSON.data) {
    throw new ToolError(`No introspection query result data found in: ${schemaPath}`);
  }

  const schema = buildClientSchema(schemaJSON.data);
  const schemaIDL = printSchema(schema, options);

  if (outputPath) {
    fs.writeFileSync(outputPath, schemaIDL);
  } else {
    console.log(schemaIDL);
  }
}
