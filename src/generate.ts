import * as fs from 'fs';

import { ToolError, logError } from './errors'
import { loadSchema,  loadAndMergeQueryDocuments } from './loading'
import { validateQueryDocument } from './validation'
import { compileToIR } from './compilation'
import serializeToJSON from './serializeToJSON'
import { generateSource as generateSwiftSource } from './swift'
import { generateSource as generateTypescriptSource } from './typescript'
import { generateSource as generateFlowSource } from './flow'

type TargetType = 'json' | 'swift' | 'ts' | 'typescript' | 'flow';

export default function generate(
  inputPaths: string[],
  schemaPath: string,
  outputPath: string,
  target: TargetType,
  tagName: string,
  options: any
) {
  const schema = loadSchema(schemaPath);

  const document = loadAndMergeQueryDocuments(inputPaths, tagName);

  validateQueryDocument(schema, document, target);

  if (target === 'swift') {
    options.addTypename = true;
  }

  const context = compileToIR(schema, document, options);
  Object.assign(context, options);

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

  if (context.generateOperationIds) {
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
