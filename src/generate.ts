import * as fs from 'fs';

import { ToolError, logError } from './errors'
import { loadSchema,  loadAndMergeQueryDocuments } from './loading'
import { validateQueryDocument } from './validation'
import { compileToIR } from './compilation'
import serializeToJSON from './serializeToJSON'
import { generateSource as generateSwiftSource } from './swift'
import { generateSource as generateTypescriptSource } from './typescript'
import { generateSource as generateFlowSource } from './flow'
import {buildASTSchema, extendSchema} from "graphql";
import { Kind } from 'graphql/language';

type TargetType = 'json' | 'swift' | 'ts' | 'typescript' | 'flow';

export default function generate(
  inputPaths: string[],
  schemaPaths: string[],
  outputPath: string,
  target: TargetType,
  tagName: string,
  options: any
) {
  let schema = loadAndMergeQueryDocuments(schemaPaths, tagName);
  let schemaAST = buildASTSchema(schema);
  let extensionDefs = schema.definitions.filter((def) => def.kind === Kind.TYPE_EXTENSION_DEFINITION);
  if( extensionDefs.length > 0 )
    schemaAST = extendSchema(schemaAST, {...schema, definitions:extensionDefs});


  const document = loadAndMergeQueryDocuments(inputPaths, tagName);

  validateQueryDocument(schemaAST, document, target);

  if (target === 'swift') {
    options.addTypename = true;
  }

  const context = compileToIR(schemaAST, document, options);

  let output = '';
  switch (target) {
    case 'json':
      output = serializeToJSON(context);
      break;
    case 'ts':
    case 'typescript':
      output = generateTypescriptSource(context);
      break;
    case 'flow':
      output = generateFlowSource(context);
      break;
    case 'swift':
      output = generateSwiftSource(context, options);
      break;
  }

  if (outputPath) {
    fs.writeFileSync(outputPath, output);
  } else {
    console.log(output);
  }

  if (options.generateOperationIds) {
    writeOperationIdsMap(context)
  }
}

interface OperationIdsMap {
  name: string,
  source: string
}

function writeOperationIdsMap(context: any) {
  let operationIdsMap: { [id: string]: OperationIdsMap } = {};
  Object.values(context.operations).forEach(operation => {
    operationIdsMap[operation.operationId] = {
      name: operation.operationName,
      source: operation.sourceWithFragments  
    };
  });
  fs.writeFileSync(context.operationIdsPath, JSON.stringify(operationIdsMap, null, 2));
}
