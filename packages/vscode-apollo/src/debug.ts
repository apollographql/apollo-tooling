import { window, workspace, OutputChannel } from "vscode";

export class Debug {
  private static calls: number = 0;
  private static outputConsole?: OutputChannel;

  public static SetOutputConsole(outputConsole: OutputChannel) {
    this.outputConsole = outputConsole;
  }

  /**
   * Displays an info message prefixed with [INFO]
   */
  public static info(message: string) {
    this.outputConsole && this.outputConsole.appendLine(`[INFO] ${message}`);
  }

  /**
   * Displays and error message prefixed with [ERROR]
   */
  public static error(message: string) {
    Debug.showConsole();
    this.outputConsole && this.outputConsole.appendLine(`[ERROR] ${message}`);
  }

  /**
   * Displays and warning message prefixed with [WARN]
   */
  public static warning(message: string) {
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
