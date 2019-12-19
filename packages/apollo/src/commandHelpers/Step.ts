import { Status } from "./Status";

export interface Step {
  /**
   * Name of the step
   *
   * Keep in mind this can be changed
   */
  name: React.ReactChild;
  /**
   * Enum of the current status. Each status can be changed independently
   */
  status: Status;
  /**
   * Error that occured for this step
   */
  error?: Error;

  /**
   * Unique key for the step
   *
   * This is used as a `key` prop in React so it must be unique
   */
  key: string;

  steps?: Step[];
}
