import { GraphQLError, printError } from "graphql";

export class GraphQLSchemaValidationError extends Error {
  constructor(public errors: ReadonlyArray<GraphQLError>) {
    super();

    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
    this.message = errors.map(error => error.message).join("\n\n");
  }

  toString() {
    return this.errors.map(error => printError(error)).join("\n\n");
  }
}
