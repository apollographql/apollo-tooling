import { buildSchema, printSchema } from "graphql";
import { transformSchema } from "../transformSchema";

describe("transformSchema", () => {
  test("no-op transform leaves types untouched", () => {
    const schema = buildSchema(`#graphql
    type Query {
      foo: String @test(baz: { bar: "hello" })
    }

    input DirectiveArg {
      bar: String
    }

    # https://github.com/apollographql/apollo-tooling/issues/2162
    directive @test(baz: DirectiveArg) on FIELD_DEFINITION
    `);

    const newSchema = transformSchema(schema, namedType => namedType);

    expect(printSchema(newSchema)).toEqual(printSchema(schema));
  });
});
