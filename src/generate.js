import fs from 'fs'

import { ToolError, logError } from './errors'
import { loadSchema,  loadAndMergeQueryDocuments } from './loading'
import { validateQueryDocument } from './validation'
import { Compiler, stringifyIR } from './compilation'
import { generateSource } from './swift'

export default function generate(inputPaths, schemaPath, outputPath, target) {
  const schema = loadSchema(schemaPath);

  const document = loadAndMergeQueryDocuments(inputPaths);

  validateQueryDocument(schema, document);

  const context = new Compiler(schema, document);

  const output = (target && target.toLowerCase() === 'json') ? generateIR(context) : generateSource(context);

  fs.writeFileSync(outputPath, output);
}

function generateIR(context) {
  return stringifyIR({
    operations: context.operations.map(operation => context.compileOperation(operation)),
    fragments: context.fragments.map(fragment => context.compileFragment(fragment)),
  }, '\t');
}
