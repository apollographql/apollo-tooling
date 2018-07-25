import * as React from "react";

import { VariableEditor } from "graphiql/dist/components/VariableEditor";

import "graphiql/graphiql.css";
import { vscode } from ".";

export class VariablesInput extends React.Component<{ variables: any }, { variables: any }> {
  constructor(props: { variables: any }) {
    super(props);
    this.state = props;
  }

  public componentWillReceiveProps(_: { variables: any }, newProps: { variables: any }) {
    this.setState(newProps);
  }

  public render() {
    return (
      <div>
        <VariableEditor
          value={JSON.stringify(this.state.variables, undefined, 2)}
          onEdit={(v: string) => {
            console.log(JSON.parse(v));
            this.setState({ variables: JSON.parse(v) });
          }}
        />
        <button onClick={() => {
          console.log(JSON.stringify(this.state.variables));
          vscode.postMessage({
            type: "variables",
            content: this.state.variables
          });
        }}>Submit</button>
      </div>
    );
  }
}
