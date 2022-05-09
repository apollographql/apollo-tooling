import { buildClientSchema, GraphQLSchema, Source } from "graphql";
import { GraphQLDocument } from "../document";
import { collectExecutableDefinitionDiagnostics } from "../diagnostics";
import { existsSync } from "fs";
import { ToolError } from "../errors/logger";

export function loadSchema(schemaPath: string): GraphQLSchema {
  if (!existsSync(schemaPath)) {
    throw new ToolError(`Cannot find GraphQL schema file: ${schemaPath}`);
  }
  const schemaData = require(schemaPath);

  if (!schemaData.data && !schemaData.__schema) {
    throw new ToolError(
      "GraphQL schema file should contain a valid GraphQL introspection query result"
    );
  }
  return buildClientSchema(schemaData.data ? schemaData.data : schemaData);
}

const schema = loadSchema(
  require.resolve("../../../../__fixtures__/starwars/schema.json")
);
const validDocument = new GraphQLDocument(
  new Source(`
    query HeroAndFriendsNames {
      hero {
        name
        friends {
          name
        }
      }
    }`)
);
const invalidDocument = new GraphQLDocument(
  new Source(`
    query HeroAndFriendsNames {
      hero {
        nam         # Missing letter 'e'
        friend {    # Missing letter 's'
          name
        }
      }
    }`)
);
const documentWithTypes = new GraphQLDocument(
  new Source(`
    type SomeType {
      thing: String
    }
     enum SomeEnum {
      THING_ONE
      THING_TWO
    }
     query HeroAndFriendsNames {
      hero {
        name
        friends {
          name
        }
      }
    }`)
);
const documentWithOffset = new GraphQLDocument(
  new Source(`query QueryWithOffset { hero { nam } }`, "testDocument", {
    line: 5,
    column: 10,
  })
);
describe("Language server diagnostics", () => {
  describe("#collectExecutableDefinitionDiagnostics", () => {
    it("returns no diagnostics for a correct document", () => {
      const diagnostics = collectExecutableDefinitionDiagnostics(
        schema,
        validDocument
      );
      expect(diagnostics.length).toEqual(0);
    });
    it("returns two diagnostics for a document with two errors", () => {
      const diagnostics = collectExecutableDefinitionDiagnostics(
        schema,
        invalidDocument
      );
      expect(diagnostics.length).toEqual(2);
    });
    it("returns no diagnostics for a document that includes type definitions", () => {
      const diagnostics = collectExecutableDefinitionDiagnostics(
        schema,
        documentWithTypes
      );
      expect(diagnostics.length).toEqual(0);
    });
    it("correctly offsets locations", () => {
      const diagnostics = collectExecutableDefinitionDiagnostics(
        schema,
        documentWithOffset
      );
      expect(diagnostics.length).toEqual(1);
      expect(diagnostics[0].range.start.character).toEqual(40);
    });
  });
});
