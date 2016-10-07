import { expect } from 'chai';

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
  beforeEach(function() {
    this.generator = new CodeGenerator();
  });

  it(`should generate a class declaration`, function() {
    classDeclaration(this.generator, { className: 'Hero', modifiers: ['public', 'final'] }, () => {
      propertyDeclaration(this.generator, { propertyName: 'name', typeName: 'String' });
      propertyDeclaration(this.generator, { propertyName: 'age', typeName: 'Int' });
    });

    expect(this.generator.output).to.equal(stripIndent`
      public final class Hero {
        public let name: String
        public let age: Int
      }
    `);
  });

  it(`should generate a struct declaration`, function() {
    structDeclaration(this.generator, { structName: 'Hero' }, () => {
      propertyDeclaration(this.generator, { propertyName: 'name', typeName: 'String' });
      propertyDeclaration(this.generator, { propertyName: 'age', typeName: 'Int' });
    });

    expect(this.generator.output).to.equal(stripIndent`
      public struct Hero {
        public let name: String
        public let age: Int
      }
    `);
  });

  it(`should generate nested struct declarations`, function() {
    structDeclaration(this.generator, { structName: 'Hero' }, () => {
      propertyDeclaration(this.generator, { propertyName: 'name', typeName: 'String' });
      propertyDeclaration(this.generator, { propertyName: 'friends', typeName: '[Friend]' });

      structDeclaration(this.generator, { structName: 'Friend' }, () => {
        propertyDeclaration(this.generator, { propertyName: 'name', typeName: 'String' });
      });
    });

    expect(this.generator.output).to.equal(stripIndent`
      public struct Hero {
        public let name: String
        public let friends: [Friend]

        public struct Friend {
          public let name: String
        }
      }
    `);
  });

  it(`should generate a protocol declaration`, function() {
    protocolDeclaration(this.generator, { protocolName: 'HeroDetails', adoptedProtocols: ['HasName'] }, () => {
      protocolPropertyDeclaration(this.generator, { propertyName: 'name', typeName: 'String' });
      protocolPropertyDeclaration(this.generator, { propertyName: 'age', typeName: 'Int' });
    });

    expect(this.generator.output).to.equal(stripIndent`
      public protocol HeroDetails: HasName {
        var name: String { get }
        var age: Int { get }
      }
    `);
  });
});
