import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';

import { loadSchema, loadSchemaFromConfig, loadAndMergeQueryDocuments } from './loading';
import { validateQueryDocument } from './validation';
import { compileToIR } from './compiler';
import { compileToLegacyIR } from './compiler/legacyIR';
import serializeToJSON from './serializeToJSON';
import { BasicGeneratedFile } from './utilities/CodeGenerator'
import { generateSource as generateSwiftSource } from './swift';
import { generateSource as generateTypescriptSource } from './typescript';
import { generateSource as generateFlowSource } from './flow';
import { generateSource as generateFlowModernSource } from './javascript/flow';
import { generateSource as generateTypescriptModernSource } from './javascript/typescript';
import { generateSource as generateScalaSource } from './scala';

type TargetType = 'json' | 'swift' | 'ts' | 'typescript'
  | 'flow' | 'scala' | 'flow-modern' | 'typescript-modern'
  | 'ts-modern';

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
  else if (target === 'flow-modern' || target === 'typescript-modern' || target === 'ts-modern') {
    const context = compileToIR(schema, document, options);
    const generatedFiles = target === 'flow-modern'
      ? generateFlowModernSource(context)
      : generateTypescriptModernSource(context) ;

    // Group by output directory
    const filesByOutputDirectory: {
      [outputDirectory: string]: {
        [fileName: string]: BasicGeneratedFile
      }
    } = {};

    Object.keys(generatedFiles)
      .forEach((filePath: string) => {
        const outputDirectory = path.dirname(filePath);
        if (!filesByOutputDirectory[outputDirectory]) {
          filesByOutputDirectory[outputDirectory] = {
            [path.basename(filePath)]: generatedFiles[filePath]
          };
        } else {
          filesByOutputDirectory[outputDirectory][path.basename(filePath)] = generatedFiles[filePath];
        }
      })

    Object.keys(filesByOutputDirectory)
      .forEach((outputDirectory) => {
        writeGeneratedFiles(
          filesByOutputDirectory[outputDirectory],
          outputDirectory
        );
      });
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
