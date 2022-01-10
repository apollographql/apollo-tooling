import { parse } from "graphql";

import { loadSchema } from "apollo-codegen-core/lib/loading";
const schema = loadSchema(
  require.resolve("../../../../__fixtures__/scalars/schema.json")
);

import {
  compileToIR,
  CompilerOptions,
  CompilerContext
} from "apollo-codegen-core/lib/compiler";

import { generateSource } from "../codeGeneration";

function compile(
  source: string,
  options: CompilerOptions = {
    mergeInFieldsFromFragmentSpreads: true,
    addTypename: true
  }
): CompilerContext {
  const document = parse(source);
  return compileToIR(schema, document, options);
}

describe("Typescript codeGeneration", () => {
  test("simple hero query", () => {
    const context = compile(`
      query GetDeities($lifespan: Lifespan) {
          deities(lifespan: $lifespan) {
            ... on God {
              name
              lifespan
            }
            ... on Deity_Titan {
              name
            }
          }
        }
    `);

    const output = generateSource(context);
    expect(output).toMatchSnapshot();
  });
});
