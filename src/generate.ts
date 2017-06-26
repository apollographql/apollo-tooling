import * as fs from 'fs'

import { ToolError, logError } from './errors'
import { loadSchema,  loadAndMergeQueryDocuments } from './loading'
import { validateQueryDocument } from './validation'
import { compileToIR } from './compilation'
import serializeToJSON from './serializeToJSON'
import { generateSource as generateSwiftSource } from './swift'
import { generateSource as generateTypescriptSource } from './typescript'
import { generateSource as generateFlowSource } from './flow'

<<<<<<< HEAD:src/generate.ts
type TargetType = 'json' | 'swift' | 'ts' | 'typescript' | 'flow';

export default function generate(
  inputPaths: string[],
  schemaPath: string,
  outputPath: string,
  target: TargetType,
  tagName: string,
  options: any
) {
=======
export default function generate(inputPaths, schemaPath, outputPath, target, tagName, options) {
>>>>>>> 19f860a68805d3596fb895a2f6fc4987b3e18bb8:src/generate.js
  const schema = loadSchema(schemaPath);

  const document = loadAndMergeQueryDocuments(inputPaths, tagName);

  validateQueryDocument(schema, document, target);

  if (target === 'swift') {
    if (!options.addTypename) {
      console.warn('This option is a no-op for Swift because __typename is already added automatically');
    }
    options.addTypename = true;
    options.mergeInFieldsFromFragmentSpreads = true;
  } else {
    if (options.addTypename) {
      options.addTypename = true;
    }
    options.mergeInFieldsFromFragmentSpreads = true;
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
}
