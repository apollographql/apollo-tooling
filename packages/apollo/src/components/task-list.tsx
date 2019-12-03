import React from "react";
import { Box } from "ink";
import Task from "./task";

/**
 * This task list component takes a list of running and finished tasks
 * and renders them with spinners and checkmarks respectively.
 *
 * Tasks can either be strins or list of strings. Lists of strings will be
 * concatenated together, with segments starting with %c highlighted in cyan
 * for example: <TaskList running={["task 1", ["task", "%c 2"]]} /> would render 2 tasks,
 * the first all white, and the second with the number 2 in cyan instead of white.
 */
export default ({
  running = [],
  done = []
}: {
  running: Array<string | string[]>;
  done: Array<string | string[]>;
}) => {
  return (
    <Box flexDirection={"column"}>
      {done.map(title => (
        <Task
          key={Array.isArray(title) ? title.join() : title}
          title={title}
          status={"done"}
        />
      ))}
      {running.map(title => (
        <Task
          key={Array.isArray(title) ? title.join() : title}
          title={title}
          status={"running"}
        />
      ))}
    </Box>
  );
};
