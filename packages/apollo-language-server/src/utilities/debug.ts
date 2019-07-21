import { IConnection } from "vscode-languageserver";

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
    Debug.connection
      ? Debug.connection.sendNotification("serverDebugMessage", {
          type: "error",
          message: message
        })
      : console.error("[ERROR] " + message);
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
