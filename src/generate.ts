import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';

import { loadSchema, loadSchemaFromConfig, loadAndMergeQueryDocuments } from './loading';
import { validateQueryDocument } from './validation';
import { compileToIR } from './compiler';
import { compileToLegacyIR } from './compiler/legacyIR';
import serializeToJSON from './serializeToJSON';
import { GeneratedFile } from './utilities/CodeGenerator'
import { generateSource as generateSwiftSource } from './swift';
import { generateSource as generateTypescriptSource } from './typescript';
import { generateSource as generateFlowSource } from './flow';
import { generateSource as generateFlowModernSource } from './flow-modern';
import { generateSource as generateScalaSource } from './scala';

type TargetType = 'json' | 'swift' | 'ts' | 'typescript' | 'flow' | 'scala' | 'flow-modern';

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
  else if (target === 'flow-modern') {

    const context = compileToIR(schema, document, options);
    // const outputIndividualFiles = fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory();
    const outputIndividualFiles = true;
    const generatedFiles = generateFlowModernSource(context, outputIndividualFiles, only);

    writeGeneratedFilesForFlowOrTypescript(generatedFiles);

  }
  else {
    let output;
    const context = compileToLegacyIR(schema, document, options);
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
      case 'scala':
        output = generateScalaSource(context, options);
    }

    if (outputPath) {
      fs.writeFileSync(outputPath, output);
    } else {
      console.log(output);
    }
  }
}

function writeGeneratedFiles(generatedFiles: { [fileName: string]: GeneratedFile }, outputDirectory: string) {
  if (!fs.existsSync(outputDirectory)) {
    fs.mkdirSync(outputDirectory);
  }
  for (const [fileName, generatedFile] of Object.entries(generatedFiles)) {
    fs.writeFileSync(path.join(outputDirectory, fileName), generatedFile.output);
  }
}

function writeGeneratedFilesForFlowOrTypescript(
  generatedFiles: { [filePath: string]: string },
) {

  // Clear all generated folders
  Object.keys(generatedFiles)
    .map(path.dirname)
    .reduce((uniqueList: string[], item: string) => {
      if (uniqueList.indexOf(item) === -1) {
        return [...uniqueList, item];
      } else {
        return uniqueList;
      }
    }, [])
    .forEach(path => rimraf.sync(path));

  // TODO: Clean this up by merging with `writeGeneratedFiles` by creating a
  // `GeneratedFile` interface that works for both cases.
  for (const [filePath, generatedFile] of Object.entries(generatedFiles)) {
    const outputDirectory = path.dirname(filePath);
    if (outputDirectory.indexOf('__generated__') === -1) {
      throw new Error('Received invalid outputDirectory ' + outputDirectory);
    }

    if (!fs.existsSync(outputDirectory)) {
      fs.mkdirSync(outputDirectory);
    }

    fs.writeFileSync(filePath, generatedFile);
  }
}

interface OperationIdsMap {
  name: string;
  source: string;
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
