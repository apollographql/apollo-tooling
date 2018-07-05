import { fs } from "apollo-codegen-core/lib/localfs";
import * as path from "path";

import { loadAndMergeQueryDocuments } from "apollo-codegen-core/lib/loading";
import { validateQueryDocument } from "./validation";
import { compileToIR, CompilerContext, CompilerOptions } from "apollo-codegen-core/lib/compiler";
import { compileToLegacyIR, CompilerOptions as LegacyCompilerOptions } from "apollo-codegen-core/lib/compiler/legacyIR";
import serializeToJSON from "apollo-codegen-core/lib/serializeToJSON";
import { BasicGeneratedFile } from "apollo-codegen-core/lib/utilities/CodeGenerator";

import { generateSource as generateSwiftSource } from "apollo-codegen-swift";
import { generateSource as generateTypescriptLegacySource } from "apollo-codegen-typescript-legacy";
import { generateSource as generateFlowLegacySource } from "apollo-codegen-flow-legacy";
import { generateSource as generateFlowSource } from "apollo-codegen-flow";
import { generateSource as generateTypescriptSource } from "apollo-codegen-typescript";
import { generateSource as generateScalaSource } from "apollo-codegen-scala";
import { GraphQLSchema } from "graphql";
import { FlowCompilerOptions } from '../../apollo-codegen-flow/lib/language';

export type TargetType =
  | "json"
  | "swift"
  | "ts-legacy"
  | "typescript-legacy"
  | "flow-legacy"
  | "scala"
  | "flow"
  | "typescript"
  | "ts";

export type GenerationOptions = CompilerOptions & LegacyCompilerOptions & FlowCompilerOptions;

export default function generate(
  inputPaths: string[],
  schema: GraphQLSchema,
  outputPath: string,
  only: string | undefined,
  target: TargetType,
  tagName: string,
  nextToSources: boolean | string,
  options: any
): number {
  let writtenFiles = 0;

  const document = loadAndMergeQueryDocuments(inputPaths, tagName);

  validateQueryDocument(schema, document);

  if (target === "swift") {
    options.addTypename = true;
    const context = compileToIR(schema, document, options);

    const outputIndividualFiles =
      fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory();

    const generator = generateSwiftSource(context, outputIndividualFiles, only);

    if (outputIndividualFiles) {
      writeGeneratedFiles(generator.generatedFiles, outputPath);
      writtenFiles += Object.keys(generator.generatedFiles).length;
    } else {
      fs.writeFileSync(outputPath, generator.output);
      writtenFiles += 1;
    }

    if (options.generateOperationIds) {
      writeOperationIdsMap(context);
      writtenFiles += 1;
    }
  } else if (target === "flow" || target === "typescript" || target === "ts") {
    const context = compileToIR(schema, document, options);
    const { generatedFiles, common } =
      target === "flow"
        ? generateFlowSource(context)
        : generateTypescriptSource(context);

    const outFiles: {
      [fileName: string]: BasicGeneratedFile;
    } = {};

    if (nextToSources) {
      generatedFiles.forEach(({ sourcePath, fileName, content }) => {
          const dir = path.join(path.dirname(sourcePath), outputPath);

          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
          }

          outFiles[path.join(dir, fileName)] = {
            output: content.fileContents + common
          };
      });

      writeGeneratedFiles(outFiles, path.resolve("."));

      writtenFiles += Object.keys(outFiles).length;
    }

    else if (fs.existsSync(outputPath) && fs.statSync(outputPath).isDirectory()) {
      generatedFiles.forEach(({ sourcePath, fileName, content }) => {
        outFiles[fileName] = {
          output: content.fileContents + common
        };
      });

      writeGeneratedFiles(outFiles, outputPath);

      writtenFiles += Object.keys(outFiles).length;
    }

    else {
      fs.writeFileSync(
        outputPath,
        generatedFiles.map(o => o.content.fileContents).join("\n") + common
      );

      writtenFiles += 1;
    }
  } else {
    let output;
    const context = compileToLegacyIR(schema, document, options);
    switch (target) {
      case "json":
        output = serializeToJSON(context);
        break;
      case "ts-legacy":
      case "typescript-legacy":
        output = generateTypescriptLegacySource(context);
        break;
      case "flow-legacy":
        output = generateFlowLegacySource(context);
        break;
      case "scala":
        output = generateScalaSource(context);
    }

    if (outputPath) {
      fs.writeFileSync(outputPath, output);
      writtenFiles += 1;
    } else {
      console.log(output);
    }
  }

  return writtenFiles;
}

function writeGeneratedFiles(
  generatedFiles: { [fileName: string]: BasicGeneratedFile },
  outputDirectory: string
) {
  for (const [fileName, generatedFile] of Object.entries(generatedFiles)) {
    fs.writeFileSync(
      path.join(outputDirectory, fileName),
      generatedFile.output
    );
  }
}

interface OperationIdsMap {
  name: string;
  source: string;
}

function writeOperationIdsMap(context: CompilerContext) {
  let operationIdsMap: { [id: string]: OperationIdsMap } = {};
  Object.keys(context.operations)
    .map(k => context.operations[k])
    .forEach(operation => {
      operationIdsMap[operation.operationId] = {
        name: operation.operationName,
        source: operation.source
      };
    });
  fs.writeFileSync(
    context.options.operationIdsPath,
    JSON.stringify(operationIdsMap, null, 2)
  );
}
