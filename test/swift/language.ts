import { stripIndent } from 'common-tags';

import {
  SwiftGenerator
} from '../../src/swift/language';

describe('Swift code generation: Basic language constructs', () => {
  let generator: SwiftGenerator<any>;

  beforeEach(() => {
    generator = new SwiftGenerator({});
  });

  test(`should generate a class declaration`, () => {
    generator.classDeclaration({ className: 'Hero', modifiers: ['public', 'final'] }, () => {
      generator.propertyDeclaration({ propertyName: 'name', typeName: 'String' });
      generator.propertyDeclaration({ propertyName: 'age', typeName: 'Int' });
    });

    expect(generator.output).toBe(stripIndent`
      public final class Hero {
        public var name: String
        public var age: Int
      }
    `);
  });

  test(`should generate a struct declaration`, () => {
    generator.structDeclaration({ structName: 'Hero' }, () => {
      generator.propertyDeclaration({ propertyName: 'name', typeName: 'String' });
      generator.propertyDeclaration({ propertyName: 'age', typeName: 'Int' });
    });

    expect(generator.output).toBe(stripIndent`
      public struct Hero {
        public var name: String
        public var age: Int
      }
    `);
  });

  test(`should generate nested struct declarations`, () => {
    generator.structDeclaration({ structName: 'Hero' }, () => {
      generator.propertyDeclaration({ propertyName: 'name', typeName: 'String' });
      generator.propertyDeclaration({ propertyName: 'friends', typeName: '[Friend]' });

      generator.structDeclaration({ structName: 'Friend' }, () => {
        generator.propertyDeclaration({ propertyName: 'name', typeName: 'String' });
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

  test(`should generate a protocol declaration`, () => {
    generator.protocolDeclaration({ protocolName: 'HeroDetails', adoptedProtocols: ['HasName'] }, () => {
      generator.protocolPropertyDeclaration({ propertyName: 'name', typeName: 'String' });
      generator.protocolPropertyDeclaration({ propertyName: 'age', typeName: 'Int' });
    });

    expect(generator.output).toBe(stripIndent`
      public protocol HeroDetails: HasName {
        var name: String { get }
        var age: Int { get }
      }
    `);
  });

  test(`should handle multi-line descriptions`, () => {
    generator.structDeclaration({ structName: 'Hero', description: 'A hero' }, () => {
      generator.propertyDeclaration({ propertyName: 'name', typeName: 'String', description: `A multiline comment \n on the hero's name.` });
      generator.propertyDeclaration({ propertyName: 'age', typeName: 'String', description: `A multiline comment \n on the hero's age.` });
    });

    expect(generator.output).toMatchSnapshot();
  });
});
