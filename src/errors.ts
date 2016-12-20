import { GraphQLError } from 'graphql';

// ToolError is used for errors that are part of the expected flow
// and for which a stack trace should not be printed

export class ToolError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ToolError'
  }
}

const isRunningFromXcodeScript = process.env.XCODE_VERSION_ACTUAL;

export function logError(error: ToolError | GraphQLError | Error) {
  if (error instanceof ToolError) {
    logErrorMessage(error.message);
  } else if (error instanceof GraphQLError) {
    const fileName = error.source && error.source.name;
    if (error.locations) {
      for (const location of error.locations) {
        logErrorMessage(error.message, fileName!, location.line);
      }
    } else {
      logErrorMessage(error.message, fileName!);
    }
  } else {
    console.log(error.stack);
  }
}

export function logErrorMessage(message: string, fileName?: string, lineNumber?: number) {
  if (isRunningFromXcodeScript) {
    if (fileName && lineNumber) {
      // Prefixing error output with file name, line and 'error: ',
      // so Xcode will associate it with the right file and display the error inline
      console.log(`${fileName}:${lineNumber}: error: ${message}`);
    } else {
      // Prefixing error output with 'error: ', so Xcode will display it as an error
      console.log(`error: ${message}`);
    }
  } else {
    console.log(message);
  }
}
