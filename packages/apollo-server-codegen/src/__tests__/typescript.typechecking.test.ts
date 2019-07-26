import { translate } from "..";
import { file } from "tmp-promise";

import ts from "typescript";
import { writeFile } from "fs";

const write = (file, text) =>
  new Promise(resolve => writeFile(file, text, resolve));

const test = async (sdl, code) => {
  const tmp = await file({ postfix: ".ts" });
  const path = tmp.path;
  const source = translate(sdl, "ts") + code;
  await write(path, source);

  const program = ts.createProgram([path], {
    strict: true,
    typeRoots: []
  });

  const diagnostics = await ts.getPreEmitDiagnostics(program);

  tmp.cleanup();

  return diagnostics.map(diagnostic =>
    typeof diagnostic.messageText === "string"
      ? diagnostic.messageText
      : diagnostic.messageText.messageText
  );
};

it("creates files that typecheck", async () => {
  const diagnostics = await test(
    `
      type Query {
        me: User
      }

      type User {
        firstName: String
        lastName: String!
        age: Int
      }
  `,
    `
    const r: Resolvers = {
      fsdfsd: 0
    }
    `
  );
  expect(diagnostics).toMatchInlineSnapshot(`
    Array [
      "Type '{ fsdfsd: number; }' is not assignable to type 'Resolvers<{}, {}>'.",
    ]
  `);
});
