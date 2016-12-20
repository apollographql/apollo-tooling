import * as fs from 'fs'

import { ToolError, logError } from './errors'
import {targetChoices, Options} from './cli'
import { loadSchema,  loadAndMergeQueryDocuments } from './loading'
import { validateQueryDocument } from './validation'
import { compileToIR } from './compilation'
import serializeToJSON from './serializeToJSON'
import { generateSource as generateSwiftSource } from './swift'
import { generateSource as generateTypescriptSource } from './typescript'
import {
  GraphQLSchema,
  GraphQLEnumType,
  GraphQLInputObjectType,
} from 'graphql';

export interface Context {
  passthroughCustomScalars: boolean;
  schema: GraphQLSchema;
  operations: any;
  fragments: any;
  typesUsed: (GraphQLEnumType | GraphQLInputObjectType)[];
}

export default function generate(inputPaths: string[], schemaPath: string, outputPath: string, target: targetChoices, options: Options) {
  const schema = loadSchema(schemaPath);

  const document = loadAndMergeQueryDocuments(inputPaths);

  validateQueryDocument(schema, document);

  const context: Context = {...compileToIR(schema, document), ...options};

  let output;
  switch (target) {
    case 'json':
      output = serializeToJSON(context);
      break;
    case 'ts':
    case 'typescript':
      output = generateTypescriptSource(context);
      break;
    case 'swift':
    default:
      output = generateSwiftSource(context);
      break;
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, output);
  } else {
    console.log(output);
  }
}
