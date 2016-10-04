import { expect } from 'chai';

import { stripIndent } from 'common-tags';

import CodeGenerator from '../../src/CodeGenerator';

import {
  classDeclaration,
  structDeclaration,
  propertyDeclaration,
  protocolDeclaration,
  protocolPropertyDeclaration
} from '../../src/swift/declarations';

describe('declarations', function() {
  beforeEach(function() {
    this.generator = new CodeGenerator();
  });

  it(`should generate a class declaration`, function() {
    classDeclaration(this.generator, { name: 'Hero', modifiers: ['public', 'final'] }, () => {
      propertyDeclaration(this.generator, { name: 'name', typeName: 'String' });
      propertyDeclaration(this.generator, { name: 'age', typeName: 'Int' });
    });

    expect(this.generator.output).to.equal(stripIndent`
      public final class Hero {
        public let name: String
        public let age: Int
      }
    `);
  });

  it(`should generate a struct declaration`, function() {
    structDeclaration(this.generator, { name: 'Hero' }, () => {
      propertyDeclaration(this.generator, { name: 'name', typeName: 'String' });
      propertyDeclaration(this.generator, { name: 'age', typeName: 'Int' });
    });

    expect(this.generator.output).to.equal(stripIndent`
      public struct Hero {
        public let name: String
        public let age: Int
      }
    `);
  });

  it(`should generate nested struct declarations`, function() {
    structDeclaration(this.generator, { name: 'Hero' }, () => {
      propertyDeclaration(this.generator, { name: 'name', typeName: 'String' });
      propertyDeclaration(this.generator, { name: 'friends', typeName: '[Friend]' });

      structDeclaration(this.generator, { name: 'Friend' }, () => {
        propertyDeclaration(this.generator, { name: 'name', typeName: 'String' });
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
    protocolDeclaration(this.generator, { name: 'HeroDetails' }, () => {
      protocolPropertyDeclaration(this.generator, { name: 'name', typeName: 'String' });
      protocolPropertyDeclaration(this.generator, { name: 'age', typeName: 'Int' });
    });

    expect(this.generator.output).to.equal(stripIndent`
      public protocol HeroDetails {
        var name: String { get }
        var age: Int { get }
      }
    `);
  });
});
