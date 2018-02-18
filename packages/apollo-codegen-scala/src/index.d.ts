import { LegacyCompilerContext, CompilerOptions } from 'apollo-codegen-compiler';
import { BasicGeneratedFile } from 'apollo-codegen-utilities';

export declare function generateSource(context: LegacyCompilerContext, options: CompilerOptions): {
  [filePath: string]: BasicGeneratedFile;
};
