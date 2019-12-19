import React, { useEffect, useState, cloneElement } from "react";
import { GraphQLClientProject } from "apollo-language-server";
import { writeFileSync } from "fs";

import { getOperationManifestFromProject } from "../../utils/getOperationManifestFromProject";
import ApolloCommand, {
  useConfig,
  useOclif,
  useProject,
  clientFlags
} from "../../NewCommand";
// import { TaskLsit } from "../../components/";
import { Text, Color, Box } from "ink";
import Spinner from "ink-spinner";
import { isString } from "util";

type TaskState<T> = {
  state: "waiting" | "loading" | "error" | "success";
  result?: T;
};

/*
  Mutliple steps, needs to support asnyc,
  needs to support a custom loading function,
  and a custom output,
  and custom error

  Loading operations
    1) <Loading/><Text>Loading operations for project</Text></Loading>
    2) <Error><Text>Operations could not be feteched, blame James</Text</Error>
    3) <Success><Text>You did it</Text></Success> (optional if other steps)

  const [_, loadProject] = useTask(() => loadProject())
  const [operations, callTaskOne] = useTask<Operations[] | undefined>(async () => loadOperationManifestFromProject(project));
  const [_, callTaskTwo] = useTask<void>(async() => writeToFile(operations));

  return (
    <TaskList persist>
      <Task task={loadProject} title="Loading Project" />
      <Task task={callTaskOne} loading={Component} error={Error}/>
      <Task task={callTaskTwo} loading={Component} error={Error} success={Component}/>
    </TaskList
  )
  */

function useTask<TResult>(task: () => Promise<TResult>, deps = []) {
  const [taskState, setTaskState] = useState<TaskState<TResult>>({
    state: "waiting"
  });

  // closure to let the <Task/> start the hook and get the state back
  function startTask() {
    setTaskState({ state: "loading" });
    return taskState;
  }

  useEffect(() => {
    if (taskState.state === "loading" || taskState.state === "waiting") return;
    task()
      .then((result: TResult) => {
        setTaskState({ result, state: "loading" });
      })
      .catch(e =>
        setTaskState(() => {
          throw new Error(e);
        })
      );
  }, [...deps, taskState]);

  return [taskState, startTask];
}

// fix child typing
const TaskList = ({ children }: { children: any }) => {
  const [statuses, setTaskStatus] = useState(new Array(children.count || 1)
    .fill["waiting"] as string[]);

  const setStatusForItem = (i: number) => (status: any) =>
    setTaskStatus(s => {
      let newStatuses = [...s];
      s[i] = status;
      return newStatuses;
    });

  // TODO: handle rendering only running/finished tasks
  // let runningTaskIndex = statuses.findIndex(s => s === "loading");
  return (
    <>
      {React.Children.map(children, (child, i) => {
        if (!child || isString(child)) return child;
        return cloneElement(child as any, {
          onStatusUpdate: setStatusForItem(i)
        }) as any;
      })}
    </>
  );
};

type TaskProps = {
  title?: string;
  task: () => TaskState<any>;
  loading?: any;
  success?: any;
  error?: any;
  onStatusUpdate?: (state: "waiting" | "loading" | "error" | "success") => any; // fire once the task finishes
};

const Task = ({
  title,
  loading,
  error,
  success,
  task,
  onStatusUpdate
}: TaskProps) => {
  const { state } = task();
  onStatusUpdate && onStatusUpdate(state);

  return (
    <Box marginLeft={2}>
      {state === "loading" && (
        <Box paddingRight={1} marginBottom={1}>
          <Color green>
            <Spinner type="dots" />
          </Color>
        </Box>
      )}
      {state === "success" && <Color green>{"✔ "}</Color>}
      {title && <Text>{title}</Text>}
    </Box>
  );
};

export default class ClientExtractReact extends ApolloCommand {
  static description = "Extract queries from a client project";
  protected type: "service" | "client" = "client";
  static args = [
    {
      name: "output",
      description: "Path to write the extracted queries to",
      required: true,
      default: "manifest.json"
    }
  ];
  static flags = {
    ...ApolloCommand.flags,
    ...clientFlags
  };

  render() {
    // const config = useConfig();
    // const { args } = useOclif();
    // const project = useProject();

    // const [running, setRunning] = useState([
    //   "Extracting operations from project"
    // ] as Array<string | React.ReactNode>);
    // const [done, setDone] = useState([] as Array<string | React.ReactNode>);
    // const [operations, setOperations] = useState();

    // // get operations from client project
    // useEffect(() => {
    //   const operations = getOperationManifestFromProject(
    //     project as GraphQLClientProject
    //   );
    //   setOperations(operations);
    //   if (!operations) throw new Error("Operations could not be fetched");
    //   setDone(running);
    //   setRunning(["Outputing extracted queries to: " + args.output]);
    // }, []);

    // // waits until operations are fetched, writes file, and updates the "done" list
    // useEffect(() => {
    //   if (!operations) return;
    //   writeFileSync(
    //     args.output,
    //     JSON.stringify({ version: 2, operations }, null, 2)
    //   );
    //   setDone([
    //     ...done,
    //     ...running,
    //     <Text>
    //       Successfully wrote <Color cyan>{operations.length}</Color> operations
    //       from the <Color cyan>{config.client!.name}</Color> client to{" "}
    //       <Color cyan>{args.output}</Color>
    //     </Text>
    //   ]);
    //   setRunning([]);
    // }, [operations]);

    // return <TaskList running={running} done={done} />;

    const [res, startTask] = useTask(() => {
      // sample task that returns "123" after 2 secs
      return new Promise(resolve => setTimeout(resolve, 2000)).then(_ => "123");
    });

    return (
      <TaskList>
        <Task task={startTask} title="My First Task" />
      </TaskList>
    );
  }
}
