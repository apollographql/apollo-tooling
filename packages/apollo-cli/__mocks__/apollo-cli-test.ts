import Nock from "@fancy-test/nock";
import * as Test from "@oclif/test";
export { expect } from "@oclif/test";

export const test = Test.test.register("nock", Nock);
