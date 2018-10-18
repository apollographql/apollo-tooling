import { IConnection, NotificationType } from "vscode-languageserver";

export class LoadingHandler {
  constructor(private connection: IConnection) {}
  private latestLoadingToken = 0;
  async handle<T>(message: string, value: Promise<T>): Promise<T> {
    const token = this.latestLoadingToken;
    this.latestLoadingToken += 1;
    this.connection.sendNotification(
      new NotificationType<any, void>("apollographql/loading"),
      { message, token }
    );
    try {
      const ret = await value;
      this.connection.sendNotification(
        new NotificationType<any, void>("apollographql/loadingComplete"),
        token
      );
      return ret;
    } catch (e) {
      this.connection.sendNotification(
        new NotificationType<any, void>("apollographql/loadingComplete"),
        token
      );
      this.connection.window.showErrorMessage(`Error in "${message}": ${e}`);
      throw e;
    }
  }
  handleSync<T>(message: string, value: () => T): T {
    const token = this.latestLoadingToken;
    this.latestLoadingToken += 1;
    this.connection.sendNotification(
      new NotificationType<any, void>("apollographql/loading"),
      { message, token }
    );
    try {
      const ret = value();
      this.connection.sendNotification(
        new NotificationType<any, void>("apollographql/loadingComplete"),
        token
      );
      return ret;
    } catch (e) {
      this.connection.sendNotification(
        new NotificationType<any, void>("apollographql/loadingComplete"),
        token
      );
      this.connection.window.showErrorMessage(`Error in "${message}": ${e}`);
      throw e;
    }
  }
}
