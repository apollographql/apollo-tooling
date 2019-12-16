import React from "react";
import { Box, Text } from "ink";
import Task from "./task";
import { isString } from "util";

/**
 * This task list component takes a list of running and finished tasks
 * and renders them with spinners and checkmarks respectively.
 *
 * tasks can either be strings to print verbatim or components to be rendered
 * with a spinner or check before them.
 *
 * NOTE: Do not manually add checks or spinners to custom tasks, these are automatically
 * added by the component
 */

export enum Status {
  pending = "pending",
  skipped = "skipped",
  running = "running",
  error = "error",
  complete = "complete"
}

export interface Step {
  name: string;
  status: Status;
  // Or `string`? :shrug:
  error?: Error;
}

export default ({ steps }: { steps: Step[] }) => {
  return (
    <Box flexDirection={"column"}>
      {steps.map((step, i) => {
        if (step.status !== Status.error)
          return isString(step.name) ? (
            <Task
              key={step.name}
              title={step.name}
              status={step.status === Status.running ? "running" : "done"}
            />
          ) : null;
        return (
          <Text key={step.name}>An Error Occurred: {step.error!.message}</Text>
        );
      })}
    </Box>
  );
  // return (

  //   <Box flexDirection={"column"}>
  //     {done.map((titleOrComponent, i) =>
  //       isString(titleOrComponent) ? (
  //         <Task
  //           key={titleOrComponent}
  //           title={titleOrComponent}
  //           status={"done"}
  //         />
  //       ) : (
  //         <Task status="done" key={i}>
  //           {titleOrComponent}
  //         </Task>
  //       )
  //     )}
  //     {running.map((titleOrComponent, i) =>
  //       isString(titleOrComponent) ? (
  //         <Task
  //           key={titleOrComponent}
  //           title={titleOrComponent}
  //           status={"running"}
  //         />
  //       ) : (
  //         <Task status="running" key={i}>
  //           {titleOrComponent}
  //         </Task>
  //       )
  //     )}
  //   </Box>
  // );
};
