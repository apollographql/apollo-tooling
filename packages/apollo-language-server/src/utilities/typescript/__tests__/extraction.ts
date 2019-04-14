import { extractTemplateLiterals } from "../extraction";

describe("Typescript code extraction", () => {
  describe("extractTemplateLiterals", () => {
    it("filters out templates with wrong tag", () => {
      const source = `
        const foo = foo\`foo code\`;
        const bar = bar\`bar code\`;
      `;
      const templates = extractTemplateLiterals("foo", source);
      expect(templates.length).toEqual(1);
      expect(templates[0]).toBe("foo code");
    });

    it("filters out codegen ignored tags", () => {
      const source = `
        const consiered = gql\`considered\`;

        // some comments here
        // as long as @codegen-ignore is contained
        // and there
        const ignored = gql\`ignored\`;
      `;
      const templates = extractTemplateLiterals("gql", source);
      expect(templates.length).toEqual(1);
      expect(templates[0]).toBe("considered");
    });

    it("processes anonymously declared documents", () => {
      const source = `
        bar(foo\`foo in function call\`);

        function fn(thing: DocumentNode = foo\`foo in default arg\`) {
          // body
        }
      `;
      const templates = extractTemplateLiterals("foo", source);
      expect(templates.length).toEqual(2);
      expect(templates[0]).toBe("foo in function call");
      expect(templates[1]).toBe("foo in default arg");
    });
  });
});
