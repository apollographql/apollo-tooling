import * as React from "react";
import * as ReactDOM from "react-dom";
import App from "./App";

declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
};

export const vscode = acquireVsCodeApi();

ReactDOM.render(<App />, document.getElementById("root") as HTMLElement);
