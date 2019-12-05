import React from "react";
import { Box } from "ink";
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
export default ({
  running = [],
  done = []
}: {
  running: Array<string | any>;
  done: Array<string | any>;
}) => {
  return (
    <Box flexDirection={"column"}>
      {done.map((titleOrComponent, i) =>
        isString(titleOrComponent) ? (
          <Task
            key={titleOrComponent}
            title={titleOrComponent}
            status={"done"}
          />
        ) : (
          <Task status="done" key={i}>
            {titleOrComponent}
          </Task>
        )
      )}
      {running.map((titleOrComponent, i) =>
        isString(titleOrComponent) ? (
          <Task
            key={titleOrComponent}
            title={titleOrComponent}
            status={"running"}
          />
        ) : (
          <Task status="running" key={i}>
            {titleOrComponent}
          </Task>
        )
      )}
    </Box>
  );
};
