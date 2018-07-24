import * as React from "react";

import { vscode } from "./index";

export class VariablesInput extends React.Component<{ variables: any }> {
  public render() {
    return (
      <div>
        <textarea value={JSON.stringify(this.props.variables, undefined, 2)} />
      </div>
    );
  }
}
