import { window, StatusBarItem, StatusBarAlignment } from "vscode";

export default class ApolloStatusBar {
  private statusBarItem: StatusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Right
  );

  constructor() {
    this.statusBarItem.text = "Apollo GraphQL $(rss)";
    this.statusBarItem.show();
  }

  public showLoadedState() {
    if (!window.activeTextEditor) {
      this.statusBarItem.hide();
      return;
    }

    this.statusBarItem.text = "Apollo GraphQL $(rocket)";
  }

  public showWarningState(tooltip?: string) {
    if (!window.activeTextEditor) {
      this.statusBarItem.hide();
      return;
    }

    this.statusBarItem.tooltip = tooltip;
    this.statusBarItem.text = "Apollo GraphQL $(issue-opened)";
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}
