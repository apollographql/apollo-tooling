import path from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'

import {
  buildClientSchema,
  Source,
  concatAST,
  parse,
  GraphQLEnumType
} from 'graphql';

import processQueryDocument from './processQueryDocument'
import SwiftCodeGenerator from './swift/codeGenerator'

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

  const asts = sources.map(source => parse(source));
  const ast = concatAST(asts);

  const definitions = processQueryDocument(ast, schema);

  const typeMap = schema.getTypeMap();
  // TODO: Only generate code for types that are actually used in the query documents
  let typesUsed = [];
  Object.values(typeMap).forEach(type => {
    // Skip introspection types
    if (type.name.startsWith('__')) return;

    if (type instanceof GraphQLEnumType) {
      typesUsed.push(type);
    }
  });

  const codeGenerator = new SwiftCodeGenerator();

  definitions.forEach(definition => {
    if (definition.operation !== 'query') return;

    if (!definition.name) {
      throw Error('Query definitions without a name are not supported');
    }

    codeGenerator.processQueryDefinition(definition);
  });

  codeGenerator.processTypes(typesUsed);

  const source = codeGenerator.generateSource();
  fs.writeFileSync(outputPath, source);
}
