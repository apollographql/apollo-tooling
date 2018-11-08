import {
  window,
  StatusBarItem,
  StatusBarAlignment,
  ExtensionContext,
  commands
} from "vscode";
import { LanguageClient } from "vscode-languageclient";

export default class ApolloStatusBar {
  private statusBarItem: StatusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Right
  );

  constructor(context: ExtensionContext, client: LanguageClient) {
    this.statusBarItem.text = "Apollo GraphQL $(rss)";
    this.statusBarItem.show();

    // this.statusBarItem.command = "apollographql/showOutputChannel";
    // context.subscriptions.push(this.statusBarItem);
  }

  public showLoadedState() {
    if (!window.activeTextEditor) {
      this.statusBarItem.hide();
      return;
    }

    this.statusBarItem.text = "Apollo GraphQL $(rocket)";
    this.statusBarItem.show();
  }

  public dispose() {
    this.statusBarItem.dispose();
  }
}
