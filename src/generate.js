import path from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'

import {
  buildClientSchema,
  Source,
  concatAST,
  parse,
  validate,
} from 'graphql';

import logGraphQLError from './logGraphQLError'
import { generateSource } from './swift/codeGenerator'

export default function generate(inputPaths, schemaPath, outputPath) {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Cannot find GraphQL schema file: ${schemaPath}`);
  }
  const schemaData = require(schemaPath);

  if (!schemaData.__schema) {
    throw new Error('GraphQL schema file should contain a valid GraphQL introspection query result');
  }

  const schema = buildClientSchema(schemaData);

  const sources = inputPaths.map(inputPath => {
    const body = fs.readFileSync(inputPath, 'utf8')
    return new Source(body, inputPath);
  });

  const document = concatAST(sources.map(source => parse(source)));

  const validationErrors = validate(schema, document);
  if (validationErrors && validationErrors.length > 0) {
    for (const error of validationErrors) {
      logGraphQLError(error);
    }
    throw Error("Validation of GraphQL query document failed");
  }

  const source = generateSource(schema, document);
  fs.writeFileSync(outputPath, source);
}
