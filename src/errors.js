import { GraphQLError } from 'graphql';
import * as path from 'path';

// ToolError is used for errors that are part of the expected flow
// and for which a stack trace should not be printed

export function ToolError(message) {
  this.message = message;
}

ToolError.prototype = Object.create(Error.prototype, {
  constructor: { value: ToolError },
  name: { value: 'ToolError' }
});

const isRunningFromXcodeScript = process.env.XCODE_VERSION_ACTUAL;

export function logError(error) {
  if (error instanceof ToolError) {
    logErrorMessage(error.message);
  } else if (error instanceof GraphQLError) {
    const fileName = error.source && error.source.name;
    if (error.locations) {
      for (const location of error.locations) {
        logErrorMessage(error.message, fileName, location.line);
      }
    } else {
      logErrorMessage(error.message, fileName);
    }
  } else {
    console.log(error.stack);
  }
}

export function logErrorMessage(message, fileName, lineNumber) {
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
    if (fileName) {
      const truncatedFileName = '/' + fileName.split(path.sep).slice(-4).join(path.sep);
      console.log(`...${truncatedFileName}: ${message}`);
    } else {
      console.log(`error: ${message}`);
    }
  }
}
