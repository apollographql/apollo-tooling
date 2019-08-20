import { stripIndent } from "common-tags";

import { SwiftGenerator } from "../language";

describe("Swift code generation: Basic language constructs", () => {
  let generator: SwiftGenerator<any>;

  beforeEach(() => {
    generator = new SwiftGenerator({});
  });

  it(`should generate a class declaration`, () => {
    generator.classDeclaration(
      { className: "Hero", modifiers: ["public", "final"] },
      () => {
        generator.propertyDeclaration({
          propertyName: "name",
          typeName: "String"
        });
        generator.propertyDeclaration({
          propertyName: "age",
          typeName: "Int"
        });
      }
    );

    expect(generator.output).toBe(stripIndent`
      public final class Hero {
        public var name: String
        public var age: Int
      }
    `);
  });

  it(`should generate a class declaration matching modifiers`, () => {
    generator.classDeclaration(
      { className: "Hero", modifiers: ["final"] },
      () => {
        generator.propertyDeclaration({
          propertyName: "name",
          typeName: "String"
        });
        generator.propertyDeclaration({
          propertyName: "age",
          typeName: "Int"
        });
      }
    );

    expect(generator.output).toBe(stripIndent`
      final class Hero {
        public var name: String
        public var age: Int
      }
    `);
  });

  it(`should generate a class declaration with proper escaping`, () => {
    generator.classDeclaration(
      { className: "Type", modifiers: ["public", "final"] },
      () => {
        generator.propertyDeclaration({
          propertyName: "name",
          typeName: "String"
        });
        generator.propertyDeclaration({
          propertyName: "age",
          typeName: "Int"
        });
        generator.propertyDeclaration({
          propertyName: "self",
          typeName: "Self"
        });
      }
    );

    expect(generator.output).toBe(stripIndent`
      public final class \`Type\` {
        public var name: String
        public var age: Int
        public var \`self\`: \`Self\`
      }
    `);
  });

  it(`should generate a struct declaration`, () => {
    generator.structDeclaration({ structName: "Hero" }, false, () => {
      generator.propertyDeclaration({
        propertyName: "name",
        typeName: "String"
      });
      generator.propertyDeclaration({
        propertyName: "age",
        typeName: "Int"
      });
    });

    expect(generator.output).toBe(stripIndent`
      public struct Hero {
        public var name: String
        public var age: Int
      }
    `);
  });

  it(`should generate a namespaced fragment`, () => {
    generator.structDeclaration(
      {
        structName: "Hero",
        adoptedProtocols: ["GraphQLFragment"],
        namespace: "StarWars"
      },
      false,
      () => {
        generator.propertyDeclaration({
          propertyName: "name",
          typeName: "String"
        });
        generator.propertyDeclaration({
          propertyName: "age",
          typeName: "Int"
        });
      }
    );

    expect(generator.output).toBe(stripIndent`
      public struct Hero: GraphQLFragment {
        public var name: String
        public var age: Int
      }
    `);
  });

  it(`should generate a namespaced fragment which is not public for individual files`, () => {
    generator.structDeclaration(
      {
        structName: "Hero",
        adoptedProtocols: ["GraphQLFragment"],
        namespace: "StarWars"
      },
      true,
      () => {
        generator.propertyDeclaration({
          propertyName: "name",
          typeName: "String"
        });
        generator.propertyDeclaration({
          propertyName: "age",
          typeName: "Int"
        });
      }
    );

    expect(generator.output).toBe(stripIndent`
      struct Hero: GraphQLFragment {
        public var name: String
        public var age: Int
      }
    `);
  });

  it(`should generate an escaped struct declaration`, () => {
    generator.structDeclaration({ structName: "Type" }, false, () => {
      generator.propertyDeclaration({
        propertyName: "name",
        typeName: "String"
      });
      generator.propertyDeclaration({
        propertyName: "yearOfBirth",
        typeName: "Int"
      });
      generator.propertyDeclaration({
        propertyName: "self",
        typeName: "Self"
      });
    });

    expect(generator.output).toBe(stripIndent`
      public struct \`Type\` {
        public var name: String
        public var yearOfBirth: Int
        public var \`self\`: \`Self\`
      }
    `);
  });

  it(`should generate nested struct declarations`, () => {
    generator.structDeclaration({ structName: "Hero" }, false, () => {
      generator.propertyDeclaration({
        propertyName: "name",
        typeName: "String"
      });
      generator.propertyDeclaration({
        propertyName: "friends",
        typeName: "[Friend]"
      });

      generator.structDeclaration({ structName: "Friend" }, false, () => {
        generator.propertyDeclaration({
          propertyName: "name",
          typeName: "String"
        });
      });
    });

    expect(generator.output).toBe(stripIndent`
      public struct Hero {
        public var name: String
        public var friends: [Friend]

        public struct Friend {
          public var name: String
        }
      }
    `);
  });

  it(`should generate a protocol declaration`, () => {
    generator.protocolDeclaration(
      { protocolName: "HeroDetails", adoptedProtocols: ["HasName"] },
      () => {
        generator.protocolPropertyDeclaration({
          propertyName: "name",
          typeName: "String"
        });
        generator.protocolPropertyDeclaration({
          propertyName: "age",
          typeName: "Int"
        });
        generator.protocolPropertyDeclaration({
          propertyName: "default",
          typeName: "Boolean"
        });
      }
    );

    expect(generator.output).toBe(stripIndent`
      public protocol HeroDetails: HasName {
        var name: String { get }
        var age: Int { get }
        var \`default\`: Boolean { get }
      }
    `);
  });

  it(`should handle multi-line descriptions`, () => {
    generator.structDeclaration(
      { structName: "Hero", description: "A hero" },
      false,
      () => {
        generator.propertyDeclaration({
          propertyName: "name",
          typeName: "String",
          description: `A multiline comment \n on the hero's name.`
        });
        generator.propertyDeclaration({
          propertyName: "age",
          typeName: "String",
          description: `A multiline comment \n on the hero's age.`
        });
      }
    );

    expect(generator.output).toMatchSnapshot();
  });
});
