import * as React from "react";

import { VariableEditor } from "graphiql/dist/components/VariableEditor";

import "graphiql/graphiql.css";
import { vscode } from ".";
import { GraphQLSchema, typeFromAST, GraphQLType, TypeNode } from "graphql";

function getBaseVariables(requestedVariables: any[]) {
  const obj: { [name: string]: null } = {};
  requestedVariables.filter(v => (v.typeNode as TypeNode).kind == "NonNullType").forEach(v => {
    obj[v.name] = null;
  });

  return obj;
}

export class VariablesInput extends React.Component<{ requestedVariables: any[], schema: GraphQLSchema }, { variables: any }> {
  constructor(props: { requestedVariables: any[], schema: GraphQLSchema }) {
    super(props);
    this.state = { variables: getBaseVariables(props.requestedVariables) };
  }

  public componentWillReceiveProps(_: { requestedVariables: any[] }, nextProps: { requestedVariables: any[] }) {
    this.setState({ variables: getBaseVariables(nextProps.requestedVariables) });
  }

  public render() {
    const variableToType: { [v: string]: GraphQLType } = {};
    this.props.requestedVariables.forEach(r => {
      variableToType[r.name] = typeFromAST(this.props.schema, r.typeNode)!;
    });

    return (
      <div>
        <VariableEditor
          value={JSON.stringify(this.state.variables, undefined, 2)}
          onEdit={(v: string) => {
            this.setState({ variables: JSON.parse(v) });
          }}
          variableToType={variableToType}
        />
        <button onClick={() => {
          vscode.postMessage({
            type: "variables",
            content: this.state.variables
          });
        }}>Submit</button>
      </div>
    );
  }
}
