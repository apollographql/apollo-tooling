import { window, StatusBarAlignment } from "vscode";

export default class ApolloStatusBar {
  public statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right);

  static loadingStateText = "Apollo GraphQL $(rss)";
  static loadedStateText = "ApolloGraphQL $(rocket)";

  constructor() {
    this.statusBarItem.text = ApolloStatusBar.loadingStateText;
    this.statusBarItem.show();

    this.statusBarItem.command = "apollographql/showStats";
    // context.subscriptions.push(this.statusBarItem);
  }

  public showLoadedState({
    hasActiveTextEditor
  }: {
    hasActiveTextEditor: boolean;
  }) {
    if (!hasActiveTextEditor) {
      this.statusBarItem.hide();
      return;
    }

    this.statusBarItem.text = ApolloStatusBar.loadedStateText;
    this.statusBarItem.show();
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}
