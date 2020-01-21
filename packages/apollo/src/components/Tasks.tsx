import React, {
  useEffect,
  useState,
  cloneElement,
  useRef,
  ReactElement,
  MutableRefObject,
  Dispatch,
  ReactNode
} from "react";

import { Text, Color, Box } from "ink";
import Spinner from "ink-spinner";
import { isString } from "util";

/*
  Mutliple steps, needs to support asnyc,
  needs to support a custom loading function,
  and a custom output,
  and custom error
  Loading operations
    1) <Loading/><Text>Loading operations for project</Text></Loading>
    2) <Error><Text>Operations could not be feteched, blame James</Text</Error>
    3) <Success><Text>You did it</Text></Success>
  const [_, loadProject] = useTask(() => loadProject())
  const [operations, callTaskOne] = useTask<Operations[] | undefined>(async () => loadOperationManifestFromProject(project));
  const [_, callTaskTwo] = useTask<void>(async() => writeToFile(operations));
  return (
    <Tasks>
      <Task task={loadProject} title="Loading Project" />
      <Task task={callTaskOne} done={() => <Text>You found {operations.length} ops</Text>}>
      <Task task={callTaskTwo} done={(error) => <Err message={error.message />/>
    </Tasks
  )
  */

type TaskFunction<TResult> = () => Promise<TResult>;
type TaskExecutor<T> = () => {
  task: TaskFunction<T>;
  setResult: Dispatch<React.SetStateAction<T | void>>;
};

/*
  The useTask hook takes a function that returns a promise and
  it returns an eventual result of the promise, plus a method
  for the <Task /> component to orchestrate calling the task
*/
export function useTask<TResult>(
  task: TaskFunction<TResult>
): [void | TResult, TaskExecutor<TResult>] {
  const [result, setResult] = useState<TResult | void>();
  return [result, () => ({ task, setResult })];
}

/*
  The <Tasks> component only accepts children that are <Task> components
  It controls the ordering of execution of the tasks and the basic
  flexbox layout of the task items being rendered
*/
// XXX improve child typing to only allow <Task>
export function Tasks({ children }: { children: ReactNode }) {
  // this holds a mutable promise of each task
  const _activeTaskRef = useRef(null);
  // this keeps track of the order of tasks that need to be executed
  const [selectedIndex, setSelectedIndex] = useState(0);

  const clones = React.Children.map(children, (child, index) => {
    if (!child || isString(child)) return child;
    return cloneElement(child as ReactElement, {
      _activeTaskRef,
      // only active tasks run
      isActive: index === selectedIndex,
      // the `next` prop allows a task to trigger the next one
      next: () => {
        setSelectedIndex(index + 1);
      }
    });
  });

  return <Box flexDirection="column" marginTop={1} children={clones} />;
}

/*
  The <Task /> component takes a `TaskExecutor` from `useTask` as well
  as an optional title and `done` component. The task will control the
  rendering of the loading / error state, title output, and calling the
  done prop if present after the task has resolved.
*/

type TaskPropsBase = {
  title?: string | JSX.Element;
  done?: (error?: Error) => React.ReactNode;
};

type UncontrolledTaskProps<T> = TaskPropsBase & {
  task: TaskExecutor<T>;
};

type ControlledTaskProps = TaskPropsBase & {
  loading: boolean;
};

type TaskProps<T> = UncontrolledTaskProps<T> | ControlledTaskProps;

// these props are added by the cloneElement in the `<Tasks/>` component
type TaskInternalProps<T> = TaskProps<T> & {
  // internals
  isActive: boolean;
  _activeTaskRef: MutableRefObject<Promise<T> | null>;
  next: () => void;
};

type TaskState = "loading" | "error" | "success";

// XXX proper cloned elment typing
export function Task<T>(props: TaskProps<T>) {
  const {
    _activeTaskRef,
    isActive,
    next,
    title,
    done
  } = props as TaskInternalProps<T>;

  // this internal state lets us reload a specific task UI without
  // impacting other tasks
  const [state, setState] = useState<TaskState | Error>("loading");

  useEffect(() => {
    if (!isActive) return;

    // uncontrolled task version is run by the `task` prop
    if ("task" in props) {
      const { task: taskFn, setResult } = props.task();

      // start the task
      if (!_activeTaskRef.current) _activeTaskRef.current = taskFn();
      setState("loading");

      // await the task
      _activeTaskRef.current
        .then(result => {
          // end the task
          setState("success");
          setResult(result);

          // kickoff the next task
          _activeTaskRef.current = null;
          next();
        })
        .catch(error => {
          // end and don't kick off next task because it failed
          setState(error);
        });
    }

    // the only dependency that should rerun this command is the `isActive` boolean
    // XXX is this even needed since tasks can't go backwards to run again?
  }, [isActive]);

  const isError = state instanceof Error;
  let isDone = isError || state === "success";

  // for controlled tasks (i.e. controlled by another hook / source)
  // the loading boolean is the indicator of control
  if ("loading" in props) {
    isDone = !props.loading;
  }
  if (isDone && !isError && state !== "success") setState("success");

  // if the task hasn't started, don't render anything
  if (!(isActive || isDone)) return null;

  return (
    <Box flexDirection="column">
      {/* 1. Print task status and name */}
      <Box>
        {!isDone && (
          <Box paddingRight={1} marginBottom={1}>
            <Color green>
              <Spinner type="dots" />
            </Color>
          </Box>
        )}

        {/* controlled tasks need to print the checkbox too -- the second
            check says if there is no error reported and the task is done,
            it's a success */}
        {state === "success" && <Color green>{"✔ "}</Color>}

        {isError && <Color red>{"X "}</Color>}
        {title && <Text>{title}</Text>}
      </Box>

      {/* 2. Fire done callback after task finishes running */}
      {isDone && done && done(isError ? (state as Error) : undefined)}

      {/* 3. Print any errors */}
      {isError && !done && (
        <Box>
          <Color red>{(state as Error).message}</Color>
        </Box>
      )}
    </Box>
  );
}
