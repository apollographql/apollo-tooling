import { Command } from "@oclif/command";
export class LoadingHandler {
  constructor(private command: Command) {}
  async handle<T>(message: string, value: Promise<T>): Promise<T> {
    this.command.log(message);
    try {
      const ret = await value;
      return ret;
    } catch (e) {
      this.showError(`Error in "${message}": ${e}`);
      throw e;
    }
  }
  handleSync<T>(message: string, value: () => T): T {
    this.command.log(message);
    try {
      const ret = value();
      return ret;
    } catch (e) {
      this.showError(`Error in "${message}": ${e}`);
      throw e;
    }
  }
  showError(message: string) {
    this.command.error(message);
  }
}
