import path from 'path'
import fs from 'fs'
import mkdirp from 'mkdirp'

import {
  buildClientSchema,
  GraphQLEnumType
} from 'graphql';

import parseQueryDocument from './parseQueryDocument'
import {
  generateSourceForQueryDefinition,
  generateSourceForTypes
} from './swift/codeGenerator'

export default function generate(inputPaths, schemaPath, outputPath) {
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Cannot find GraphQL schema file: ${schemaPath}`);
  }
  const schemaData = require(schemaPath);

  if (!schemaData.__schema) {
    throw new Error('GraphQL schema file should contain a valid GraphQL introspection query result');
  }

  const schema = buildClientSchema(schemaData);

  // Ensure output path exists, creating intermediate directories if needed
  mkdirp.sync(outputPath);

  inputPaths.forEach(inputPath => {
    const queryDocument = fs.readFileSync(inputPath, 'utf8');

    const definitions = parseQueryDocument(queryDocument, schema);

    definitions.forEach(definition => {
      if (definition.operation !== 'query') return;

      if (!definition.name) {
        console.error(`Query definitions without a name are not supported:\n${definition.source}\n(from ${inputPath})`);
        return;
      }

      const source = generateSourceForQueryDefinition(definition);
      const filePath = path.join(outputPath, `${definition.name}Query.swift`);
      fs.writeFileSync(filePath, source);
    });
  });

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

  const source = generateSourceForTypes(typesUsed);
  const filePath = path.join(outputPath, `Types.swift`);
  fs.writeFileSync(filePath, source);
}
