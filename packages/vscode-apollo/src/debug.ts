import { window, workspace, OutputChannel } from "vscode";

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
  private static calls: number = 0;
  private static outputConsole?: OutputChannel;

  public static SetOutputConsole(outputConsole: OutputChannel) {
    this.outputConsole = outputConsole;
  }

  /**
   * Displays an info message prefixed with [INFO]
   */
  public static info(message: string, _stack?: string) {
    this.outputConsole && this.outputConsole.appendLine(`[INFO] ${message}`);
  }

  /**
   * Displays and error message prefixed with [ERROR]
   * Creates and shows a truncated stack trace
   */
  public static error(message: string, stack?: string) {
    const stackTrace = stack || createAndTrimStackTrace();
    Debug.showConsole();
    this.outputConsole && this.outputConsole.appendLine(`[ERROR] ${message}`);
    stackTrace &&
      this.outputConsole &&
      this.outputConsole.appendLine(stackTrace);
  }

  /**
   * Displays and warning message prefixed with [WARN]
   */
  public static warning(message: string, _stack?: string) {
    this.outputConsole && this.outputConsole.appendLine(`[WARN] ${message}`);
  }

  /**
   * TODO: enable error reporting and telemetry
   * Displays and warning message prefixed with [WARN]
   */
  // public static sendErrorTelemetry(message: string) {
  //   if (Config.enableErrorTelemetry) {
  //     let encoded = new Buffer(message).toString("base64");
  //     http.get("" + encoded, function () {});
  //   }
  // }

  public static clear() {
    this.outputConsole && this.outputConsole.clear();
    this.outputConsole && this.outputConsole.dispose();
  }

  private static showConsole() {
    this.outputConsole && this.outputConsole.show();
  }
}
