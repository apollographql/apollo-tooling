import React from "react";
import { Color, Box, Text } from "ink";
import Spinner from "ink-spinner";

/**
 * A Simple task component which renders tasks with either a
 * spinner or a checkbox before their title. If the task is
 * passed a `title` prop, that text will be rendered. If the
 * component is passed children, it will render the child with
 * the loader or check before it.
 */
export default ({
  title,
  status = "running",
  children
}: {
  title?: string;
  children?: any;
  status?: "running" | "done";
}) => (
  <Box marginLeft={2}>
    {status === "running" && (
      <Box paddingRight={1} marginBottom={1}>
        <Color green>
          <Spinner type="dots" />
        </Color>
      </Box>
    )}
    {status === "done" && <Color green>{"✔ "}</Color>}
    {children ? children : <Text>{title}</Text>}
  </Box>
);
