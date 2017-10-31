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
  const generator = new FlowGenerator(context);

  generator.fileHeader();

  context.typesUsed.forEach(type => {
    generator.typeDeclarationForGraphQLType(type);
  });

  // Object.values(context.operations).forEach(operation => {
  //   // generator.typeVariablesDeclarationForOperation(operation);
  //   generator.typeDeclarationForOperation(operation);
  // });

  // Object.values(context.fragments).forEach(fragment => {
  //   // console.log('Fragment', fragment);
  // });

  return generator.output;
}

const fileHeader = stripIndent`
  /* @flow */
  // This file was automatically generated and should not be edited.
`;

export class FlowAPIGenerator extends FlowGenerator {
  context: CompilerContext
  printer: Printer

  constructor(context: CompilerContext) {
    this.context = context;
    this.printer = new Printer();
  }

  typeDeclarationForGraphQLType(type: GraphQLType) {
    if (type instanceof GraphQLEnumType) {
      this.enumerationDeclaration(type);
    } else if (type instanceof GraphQLInputObjectType) {
      this.structDeclarationForInputObjectType(type);
    }
  }

  public get output() {
    return this.printer.print();
  }
}
