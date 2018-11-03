import { stripIndents } from "common-tags";
import * as fs from "fs";
import * as path from "path";

import {
  extractDocumentFromJavascript,
  loadAndMergeQueryDocuments
} from "../loading";

// Test example javascript source files are located within __fixtures__
describe("extractDocumentFromJavascript", () => {
  test("normal queries", () => {
    const contents = fs
      .readFileSync(path.join(__dirname, "__fixtures__", "normal.js"))
      .toString();
    expect(stripIndents`${extractDocumentFromJavascript(contents)}`).toMatch(
      stripIndents`
          query UserProfileView {
            me {
              id
              uuid
              role
            }
          }
        `
    );
  });

  test("comments in template string", () => {
    const contents = fs
      .readFileSync(path.join(__dirname, "__fixtures__", "comments.js"))
      .toString();
    expect(stripIndents`${extractDocumentFromJavascript(contents)}`).toMatch(
      stripIndents`
          query UserProfileView {
            me {
              id
              # TODO: https://www.fast.com/sdf/sdf
              uuid
              # Some other comment
              role
            }
          }
        `
    );
  });

  test("gql completely commented out", () => {
    const contents = fs
      .readFileSync(path.join(__dirname, "__fixtures__", "commentedOut.js"))
      .toString();
    expect(extractDocumentFromJavascript(contents)).toBeNull();
  });

  test("invalid gql", () => {
    const contents = fs
      .readFileSync(path.join(__dirname, "__fixtures__", "invalid.js"))
      .toString();
    expect(extractDocumentFromJavascript(contents)).toBeNull();
  });
});

describe("Validation", () => {
  test(`should extract gql snippet from javascript file`, () => {
    const inputPaths = [
      path.join(__dirname, "../../../../__fixtures__/starwars/gqlQueries.js")
    ];

    const document = loadAndMergeQueryDocuments(inputPaths);

    expect(document).toMatchSnapshot();
  });
});
