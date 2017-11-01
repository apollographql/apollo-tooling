import {
  getNamedType,
  GraphQLEnumType,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLInputField,
  GraphQLList,
  GraphQLObjectType,
  GraphQLNonNull,
  isCompositeType,
  GraphQLError,
  GraphQLType
} from 'graphql';

import Helpers from './helpers';

import { wrap } from '../utilities/printing';

import {
  CompilerContext,
  Operation,
  SelectionSet,
  Field,
} from '../compiler';

import {
  Variant
} from '../compiler/visitors/typeCase.ts';

import {
  typeCaseForSelectionSet
} from '../compiler/visitors/typeCase';

import { stripIndent } from 'common-tags';

// import {
//   collectFragmentsReferenced
// } from '../compiler/visitors/collectFragmentsReferenced';

import {
  collectAndMergeFields
} from '../compiler/visitors/collectAndMergeFields';

import { parse } from 'babylon';
import generate from 'babel-generator';
import * as t from 'babel-types';

import Printer from './printer';
import FlowGenerator from './language';

export function generateSource(context: CompilerContext) {
  const generator = new FlowAPIGenerator(context);

  generator.fileHeader();

  context.typesUsed
    .filter(type => type instanceof GraphQLEnumType)
    .forEach((enumType: GraphQLEnumType) => {
      generator.typeAliasForEnumType(enumType);
    });

  context.typesUsed
    .filter(type => type instanceof GraphQLInputObjectType)
    .forEach((enumType: GraphQLInputObjectType) => {
      generator.typeAliasForInputObjectType(enumType);
    });

  Object.values(context.operations).forEach(operation => {
    // generator.typeVariablesDeclarationForOperation(operation);
    // generator.typeDeclarationForOperation(operation);
  });

  Object.values(context.fragments).forEach(fragment => {
    // console.log('Fragment', fragment);
  });

  return generator.output;
}


export class FlowAPIGenerator extends FlowGenerator {
  context: CompilerContext
  printer: Printer

  constructor(context: CompilerContext) {
    super();

    this.context = context;
    this.printer = new Printer();
  }

  fileHeader() {
    this.printer.enqueue(
      stripIndent`
        /* @flow */
        // This file was automatically generated and should not be edited.
      `
    );
  }

  public typeAliasForEnumType(enumType: GraphQLEnumType) {
    this.printer.enqueue(this.enumerationDeclaration(enumType));
  }

  public typeAliasForInputObjectType(inputObjectType: GraphQLInputObjectType) {
    this.printer.enqueue(this.inputObjectDeclaration(inputObjectType));
  }

  public get output() {
    return this.printer.print();
  }
}
