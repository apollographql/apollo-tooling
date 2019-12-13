import React from "react";
import { render, Color, Box } from "ink";
import Spinner from "ink-spinner";
import { Status } from "./Status";
import { Step } from "./Step";
import Table from "ink-table";

interface Props {
  steps: ReadonlyArray<Step>;
}

export const Progress: React.FC<Props> = ({ steps }) => {
  const StatusBullet: Record<Status, React.ReactNode> = {
    [Status.pending]: " ",
    [Status.skipped]: " ",
    [Status.running]: React.createElement(Spinner as any, { type: "dots" }),
    [Status.complete]: <Color green>✔</Color>,
    [Status.error]: <Color red>x</Color>
  };

  return (
    <>
      {steps.map(step => {
        return (
          <Box key={step.key}>
            <Box paddingRight={1}>{StatusBullet[step.status]}</Box>
            <Box>
              <Box flexDirection="column">
                <Box>{step.name}</Box>
                {step.error && (
                  <Box textWrap="wrap">
                    <Color red>
                      {step.error.name}: {step.error.message}
                    </Color>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        );
      })}
    </>
  );
};
