import { stripIndent } from 'common-tags';

import CodeGenerator from 'apollo-codegen-core/lib/utilities/CodeGenerator';

import {
  objectDeclaration,
  caseClassDeclaration,
  propertyDeclaration,
} from '../language';

describe('Scala code generation: Basic language constructs', function() {
  let generator;

  beforeEach(function() {
    generator = new CodeGenerator();
  });

  test(`should generate a object declaration`, function() {
    objectDeclaration(generator, { objectName: 'Hero' }, () => {
      propertyDeclaration(generator, { propertyName: 'name', typeName: 'String' }, () => {});
      propertyDeclaration(generator, { propertyName: 'age', typeName: 'Int' }, () => {});
    });

    expect(generator.output).toBe(stripIndent`
      object Hero {
        val name: String = {
        }
        val age: Int = {
        }
      }
    `);
  });

  test(`should generate a case class declaration`, function() {
    caseClassDeclaration(generator, { caseClassName: 'Hero', params: [{name: 'name', type: 'String'}, {name: 'age', type: 'Int'}] }, () => {});

    expect(generator.output).toBe(stripIndent`
      case class Hero(name: String, age: Int) {
      }
    `);
  });

  test(`should generate nested case class declarations`, function() {
    caseClassDeclaration(generator, { caseClassName: 'Hero', params: [{name: 'name', type: 'String'}, {name: 'age', type: 'Int'}] }, () => {
      caseClassDeclaration(generator, { caseClassName: 'Friend', params: [{name: 'name', type: 'String'}] }, () => {});
    });

    expect(generator.output).toBe(stripIndent`
      case class Hero(name: String, age: Int) {
        case class Friend(name: String) {
        }
      }
    `);
  });

  test(`should handle multi-line descriptions`, () => {
    caseClassDeclaration(generator, { caseClassName: 'Hero', description: 'A hero' }, () => {
      propertyDeclaration(generator, { propertyName: 'name', typeName: 'String', description: `A multiline comment \n on the hero's name.` }, () => {});
      propertyDeclaration(generator, { propertyName: 'age', typeName: 'String', description: `A multiline comment \n on the hero's age.` }, () => {});
    });

    expect(generator.output).toMatchSnapshot();
  });
});
