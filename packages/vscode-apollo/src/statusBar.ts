import { window, StatusBarAlignment } from "vscode";

export default class ApolloStatusBar {
  private _statusBarItem = window.createStatusBarItem(StatusBarAlignment.Right);

  static loadingStateText = "Apollo GraphQL $(rss)";
  static loadedStateText = "ApolloGraphQL $(rocket)";

  constructor() {
    this._statusBarItem.text = ApolloStatusBar.loadingStateText;
    this._statusBarItem.show();

    // this.statusBarItem.command = "apollographql/showOutputChannel";
  }

  get statusBarItem() {
    return this._statusBarItem;
  }

  public showLoadedState({
    hasActiveTextEditor
  }: {
    hasActiveTextEditor: boolean;
  }) {
    if (!hasActiveTextEditor) {
      this._statusBarItem.hide();
      return;
    }

    this._statusBarItem.text = ApolloStatusBar.loadedStateText;
    this._statusBarItem.show();
  }

  public dispose() {
    this._statusBarItem.dispose();
  }
}
