import { LegacyCompilerContext } from 'apollo-codegen-compiler';
import { BasicGeneratedFile } from 'apollo-codegen-utilities';

export declare function generateSource(context: LegacyCompilerContext): {
  [filePath: string]: BasicGeneratedFile;
};
