import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';

import { loadSchema, loadSchemaFromConfig, loadAndMergeQueryDocuments } from 'apollo-codegen-core/lib/loading';
import { validateQueryDocument } from './validation';
import { compileToIR } from 'apollo-codegen-core/lib/compiler';
import { compileToLegacyIR } from 'apollo-codegen-core/lib/compiler/legacyIR';
import serializeToJSON from 'apollo-codegen-core/lib/serializeToJSON';
import { BasicGeneratedFile } from 'apollo-codegen-core/lib/utilities/CodeGenerator'

import { generateSource as generateSwiftSource } from 'apollo-codegen-swift';
import { generateSource as generateTypescriptLegacySource } from 'apollo-codegen-typescript-legacy';
import { generateSource as generateFlowLegacySource } from 'apollo-codegen-flow-legacy';
import { generateSource as generateFlowSource } from 'apollo-codegen-flow';
import { generateSource as generateTypescriptSource } from 'apollo-codegen-typescript';
import { generateSource as generateScalaSource } from 'apollo-codegen-scala';

type TargetType = 'json' | 'swift' | 'ts-legacy' | 'typescript-legacy'
  | 'flow-legacy' | 'scala' | 'flow' | 'typescript'
  | 'ts';

export default function generate(
  inputPaths: string[],
  schemaPath: string,
  outputPath: string,
  only: string,
  target: TargetType,
  tagName: string,
  projectName: string,
  options: any
) {
  const schema = schemaPath == null
    ? loadSchemaFromConfig(projectName)
    : loadSchema(schemaPath);

  const document = loadAndMergeQueryDocuments(inputPaths, tagName);

  validateQueryDocument(schema, document);

  if (target === 'swift') {
    options.addTypename = true;
    const context = compileToIR(schema, document, options);

    const outputIndividualFiles = fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory();

    const generator = generateSwiftSource(context, outputIndividualFiles, only);

    if (outputIndividualFiles) {
      writeGeneratedFiles(generator.generatedFiles, outputPath);
    } else {
      fs.writeFileSync(outputPath, generator.output);
    }

    if (options.generateOperationIds) {
      writeOperationIdsMap(context);
    }
  }
  else if (target === 'flow' || target === 'typescript' || target === 'ts') {
    const context = compileToIR(schema, document, options);
    const { generatedFiles, common } = target === 'flow'
      ? generateFlowSource(context)
      : generateTypescriptSource(context) ;

    const outFiles: {
      [fileName: string]: BasicGeneratedFile
    } = {};

    const outputIndividualFiles = fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory();

    if (outputIndividualFiles) {
      Object.keys(generatedFiles)
        .forEach((filePath: string) => {
          outFiles[path.basename(filePath)] = {
            output: generatedFiles[filePath].fileContents + common
          }
        });

      writeGeneratedFiles(
        outFiles,
        outputPath
      );
    } else {
      fs.writeFileSync(
        outputPath,
        Object.values(generatedFiles).map(v => v.fileContents).join("\n") + common
      );
    }
  }
  else {
    let output;
    const context = compileToLegacyIR(schema, document, options);
    switch (target) {
      case 'json':
        output = serializeToJSON(context);
        break;
      case 'ts-legacy':
      case 'typescript-legacy':
        output = generateTypescriptLegacySource(context);
        break;
      case 'flow-legacy':
        output = generateFlowLegacySource(context);
        break;
      case 'scala':
        output = generateScalaSource(context);
    }

    if (outputPath) {
      fs.writeFileSync(outputPath, output);
    } else {
      console.log(output);
    }
  }
}

function writeGeneratedFiles(
  generatedFiles: { [fileName: string]: BasicGeneratedFile },
  outputDirectory: string
) {
  // Clear all generated stuff to make sure there isn't anything
  // unnecessary lying around.
  rimraf.sync(outputDirectory);
  // Remake the output directory
  fs.mkdirSync(outputDirectory);

  for (const [fileName, generatedFile] of Object.entries(generatedFiles)) {
    fs.writeFileSync(path.join(outputDirectory, fileName), generatedFile.output);
  }
}

interface OperationIdsMap {
  name: string;
  source: string;
}

function writeOperationIdsMap(context: any) {
  let operationIdsMap: { [id: string]: OperationIdsMap } = {};
  Object.keys(context.operations).map(k => context.operations[k]).forEach(operation => {
    operationIdsMap[operation.operationId] = {
      name: operation.operationName,
      source: operation.sourceWithFragments
    };
  });
  fs.writeFileSync(context.options.operationIdsPath, JSON.stringify(operationIdsMap, null, 2));
}
