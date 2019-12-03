import React from "react";
import { Color, Box, Text } from "ink";
import Spinner from "ink-spinner";

/**
 * The title prop here takes a title to simply render OR
 * a list of title segments that can be in color. For example,
 * title={["apples are", "%c cool", "!"]} would render the phrase
 * "Apples are cool!" with the word `cool` in the color cyan
 *
 * right now, cyan is the only color supported, and a cyan segment is
 * defined by the %c indicator at the beginning of the segment
 */
export default ({
  title,
  status = "running"
}: {
  title: string | string[];
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
    {Array.isArray(title) ? (
      <Text>
        {title.map(segment =>
          segment.startsWith("%c") ? (
            <Color key={segment} cyan>
              {segment.replace("%c", "")}
            </Color>
          ) : (
            segment
          )
        )}
      </Text>
    ) : (
      <Text>{title}</Text>
    )}
  </Box>
);
