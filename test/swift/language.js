import { stripIndent } from 'common-tags';

import CodeGenerator from '../../src/utilities/CodeGenerator';

import {
  classDeclaration,
  structDeclaration,
  propertyDeclaration,
  protocolDeclaration,
  protocolPropertyDeclaration
} from '../../src/swift/language';

describe('Swift code generation: Basic language constructs', function() {
  let generator;

  beforeEach(function() {
    generator = new CodeGenerator();
  });

  test(`should generate a class declaration`, function() {
    classDeclaration(generator, { className: 'Hero', modifiers: ['public', 'final'] }, () => {
      propertyDeclaration(generator, { propertyName: 'name', typeName: 'String' });
      propertyDeclaration(generator, { propertyName: 'age', typeName: 'Int' });
    });

    expect(generator.output).toBe(stripIndent`
      public final class Hero {
        public let name: String
        public let age: Int
      }
    `);
  });

  test(`should generate a struct declaration`, function() {
    structDeclaration(generator, { structName: 'Hero' }, () => {
      propertyDeclaration(generator, { propertyName: 'name', typeName: 'String' });
      propertyDeclaration(generator, { propertyName: 'age', typeName: 'Int' });
    });

    expect(generator.output).toBe(stripIndent`
      public struct Hero {
        public let name: String
        public let age: Int
      }
    `);
  });

  test(`should generate nested struct declarations`, function() {
    structDeclaration(generator, { structName: 'Hero' }, () => {
      propertyDeclaration(generator, { propertyName: 'name', typeName: 'String' });
      propertyDeclaration(generator, { propertyName: 'friends', typeName: '[Friend]' });

      structDeclaration(generator, { structName: 'Friend' }, () => {
        propertyDeclaration(generator, { propertyName: 'name', typeName: 'String' });
      });
    });

    expect(generator.output).toBe(stripIndent`
      public struct Hero {
        public let name: String
        public let friends: [Friend]

        public struct Friend {
          public let name: String
        }
      }
    `);
  });

  test(`should generate a protocol declaration`, function() {
    protocolDeclaration(generator, { protocolName: 'HeroDetails', adoptedProtocols: ['HasName'] }, () => {
      protocolPropertyDeclaration(generator, { propertyName: 'name', typeName: 'String' });
      protocolPropertyDeclaration(generator, { propertyName: 'age', typeName: 'Int' });
    });

    expect(generator.output).toBe(stripIndent`
      public protocol HeroDetails: HasName {
        var name: String { get }
        var age: Int { get }
      }
    `);
  });

  test(`should handle multi-line descriptions`, () => {
    structDeclaration(generator, { structName: 'Hero', description: 'A hero' }, () => {
      propertyDeclaration(generator, { propertyName: 'name', typeName: 'String', description: `A multiline comment \n on the hero's name.` });
      propertyDeclaration(generator, { propertyName: 'age', typeName: 'String', description: `A multiline comment \n on the hero's age.` });
    });

    expect(generator.output).toMatchSnapshot();
  });
});
