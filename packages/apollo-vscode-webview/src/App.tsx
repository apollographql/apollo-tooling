import * as React from "react";

import { vscode } from "./index";
import { VariablesInput } from "./VariablesInput";
import { buildSchema } from "graphql";

interface VariablesInputState {
  type: "VariablesInput";
  requestedVariables: any[];
  schema: string;
}

interface WaitingForMode {
  type: "Waiting";
}

type AppModeState = WaitingForMode | VariablesInputState;

class App extends React.Component<any, AppModeState> {
  constructor(props: any) {
    super(props);

    this.state = {
      type: "Waiting"
    };
  }

  public componentDidMount() {
    vscode.postMessage({
      type: "started"
    });

    window.addEventListener("message", event => {
      const message = event.data;

      if (message.type === "setMode") {
        this.setState(message.content);
      }
    });
  }

  public render() {
    if (this.state.type === "Waiting") {
      return <div>Waiting for data from extension</div>;
    } else if (this.state.type === "VariablesInput") {
      return <VariablesInput
        requestedVariables={this.state.requestedVariables}
        schema={buildSchema(this.state.schema)}
      />;
    } else {
      return <div>Error: unknown state {JSON.stringify(this.state)}</div>;
    }
  }
}

export default App;
