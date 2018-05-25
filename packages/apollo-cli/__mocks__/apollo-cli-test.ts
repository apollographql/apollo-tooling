import Nock from "@fancy-test/nock";
import * as Test from "@oclif/test";
export { expect } from "@oclif/test";
import { mockConsole } from "heroku-cli-util";

export const test = Test.test.register("nock", Nock);
mockConsole();
