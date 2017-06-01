import * as fs from 'fs'

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
  options: any
) {
  const schema = loadSchema(schemaPath);

  const document = loadAndMergeQueryDocuments(inputPaths);

  validateQueryDocument(schema, document, target);

  if (target === 'swift') {
    if (!options.addTypename) {
      console.warn('This option is a no-op for Swift because __typename is already added automatically');
    }
    options.addTypename = true;
    options.mergeInFieldsFromFragmentSpreads = true;
  } else {
    options.mergeInFieldsFromFragmentSpreads = false;
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
      output = generateTypescriptSource(context, options);
      break;
    case 'flow':
      output = generateFlowSource(context, options);
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
}
