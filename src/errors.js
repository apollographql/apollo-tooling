import { GraphQLError } from 'graphql';

// ApolloError is used for errors that are part of the expected flow
// and for which a stack trace should not be printed

export function ApolloError(message) {
  this.message = message;
}

ApolloError.prototype = Object.create(Error.prototype, {
  constructor: { value: ApolloError },
  name: { value: 'ApolloError' }
});

const isRunningFromXcodeScript = process.env.XCODE_VERSION_ACTUAL;

export function logError(error) {
  if (error instanceof ApolloError) {
    logErrorMessage(error.message);
  } else if (error instanceof GraphQLError) {
    const fileName = error.source.name;
    const lineNumber = error.locations[0].line;
    logErrorMessage(error.message, fileName, lineNumber);
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
    console.log(message);
  }
}
