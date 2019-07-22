import { IConnection } from "vscode-languageserver";

// for errors (and other logs in debug mode) we want to print a stack trace showing where they were thrown.
// This uses an Error's stack trace, removes the three frames regarding this file (since they're useless) and
// returns the rest of the trace.
const createAndTrimStackTrace = () => {
  let stack: string | undefined = new Error().stack;
  // remove the lines in the stack from _this_ function and the caller (in this file) and shorten the trace
  return stack && stack.split("\n").length > 2
    ? stack
        .split("\n")
        .slice(3, 7)
        .join("\n")
    : stack;
};

export class Debug {
  public static connection?: IConnection;

  public static SetConnection(conn: IConnection) {
    Debug.connection = conn;
  }

  public static info(message: string) {
    Debug.connection
      ? Debug.connection.sendNotification("serverDebugMessage", {
          type: "info",
          message: message
        })
      : console.log("[INFO] " + message);
  }

  public static error(message: string) {
    const stack = createAndTrimStackTrace();
    Debug.connection
      ? Debug.connection.sendNotification("serverDebugMessage", {
          type: "error",
          message: message,
          stack
        })
      : console.error(`[ERROR] ${message}\n${stack}`);
  }

  public static warning(message: string) {
    Debug.connection
      ? Debug.connection.sendNotification("serverDebugMessage", {
          type: "warning",
          message: message
        })
      : console.warn("[WARNING] " + message);
  }

  public static sendErrorTelemetry(message: string) {
    Debug.connection &&
      Debug.connection.sendNotification("serverDebugMessage", {
        type: "errorTelemetry",
        message: message
      });
  }
}
