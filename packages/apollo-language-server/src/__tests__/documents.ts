import { Source } from "graphql";
import { loadSchema } from "apollo-codegen-core/lib/loading";
import { GraphQLDocument, extractGraphQLDocuments } from "../document";
import { collectExecutableDefinitionDiagnositics } from "../diagnostics";
import { TextDocument, Position } from "vscode-languageserver";
import { stripIndent } from "common-tags";

describe("extractGraphQLDocuments", () => {
  describe("extracting docuemnts from JavaScript template literals", () => {
    const mockTextDocument = (text): TextDocument => ({
      getText: jest.fn().mockReturnValue(text),
      offsetAt(): number {
        return 0;
      },
      positionAt(): Position {
        return {
          character: 0,
          line: 0
        };
      },
      languageId: "javascript",
      lineCount: 0,
      uri: "",
      version: 1
    });

    it("works with placeholders that span multiple rows", () => {
      const textDocument = mockTextDocument(`
      gql\`
        {
          hero {
            ...Hero_character
          }
        }

        \${Hero.fragments
          .character}
      \`
    `);
      const documents = extractGraphQLDocuments(textDocument);

      expect(documents.length).toEqual(1);
      expect(documents[0].syntaxErrors.length).toBe(0);
      expect(documents[0].ast.definitions.length).toBe(1);
    });

    it("works with multiple placeholders in a document", () => {
      const textDocument = mockTextDocument(`
      gql\`
        {
          hero {
            ...Hero_character
          }
        }

        \${Hero.fragments.character}
          
        {
          reviews(episode: NEWHOPE) {
            ...ReviewList_reviews
          }
        }
        
        \${ReviewList.fragments.reviews}                  
      \`
    `);
      const documents = extractGraphQLDocuments(textDocument);

      expect(documents.length).toEqual(1);
      expect(documents[0].syntaxErrors.length).toBe(0);
      expect(documents[0].ast.definitions.length).toBe(2);
    });
  });
});
