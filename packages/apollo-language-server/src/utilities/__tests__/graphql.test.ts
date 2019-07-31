import gql from "graphql-tag";
import { parse, print } from "graphql";
import {
  withTypenameFieldAddedWhereNeeded,
  removeDirectiveAnnotatedFields
} from "../graphql";

describe("withTypenameFieldAddedWhereNeeded", () => {
  it("properly adds __typename to each selectionSet", () => {
    const query = gql`
      query Product {
        product {
          sku
          color {
            id
            value
          }
        }
      }
    `;

    const withTypenames = withTypenameFieldAddedWhereNeeded(query);

    expect(print(withTypenames)).toMatchInlineSnapshot(`
      "query Product {
        product {
          __typename
          sku
          color {
            __typename
            id
            value
          }
        }
      }
      "
    `);
  });

  it("adds __typename to InlineFragment nodes (as ApolloClient does)", () => {
    const query = gql`
      query CartItems {
        product {
          items {
            ... on Table {
              material
            }
            ... on Paint {
              color
            }
          }
        }
      }
    `;

    const withTypenames = withTypenameFieldAddedWhereNeeded(query);

    expect(print(withTypenames)).toMatchInlineSnapshot(`
      "query CartItems {
        product {
          __typename
          items {
            __typename
            ... on Table {
              __typename
              material
            }
            ... on Paint {
              __typename
              color
            }
          }
        }
      }
      "
    `);
  });
});

describe("removeDirectiveAnnotatedFields", () => {
  it("should be a function", () => {
    expect(typeof removeDirectiveAnnotatedFields).toBe("function");
  });

  it("should remove fields with matching directives", () => {
    expect(
      print(
        removeDirectiveAnnotatedFields(
          parse(`query Query { fieldToKeep fieldToRemove @client }`),
          ["client"]
        )
      )
    ).toMatchInlineSnapshot(`
            "query Query {
              fieldToKeep
            }
            "
        `);
  });

  it("should remove object fields with matching directives", () => {
    expect(
      print(
        removeDirectiveAnnotatedFields(
          parse(`
            query Query {
              fieldToKeep
              fieldToRemove @client {
                childField
              }
            }
          `),
          ["client"]
        )
      )
    ).toMatchInlineSnapshot(`
      "query Query {
        fieldToKeep
      }
      "
    `);
  });
});
