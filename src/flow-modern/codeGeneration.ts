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
  typeCaseForSelectionSet,
  Variant
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

export function generateSource(
  context: CompilerContext,
  outputIndividualFiles?: boolean = false,
  only?: string,
) {
  const generator = new FlowAPIGenerator(context);

  if (outputIndividualFiles) {
    // TODO
  } else{
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
      generator.typeAliasForOperation(operation);
    });

    Object.values(context.fragments).forEach(fragment => {
      // console.log('Fragment', fragment);
    });
  }

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

  public typeAliasForOperation(operation: Operation) {
    const {
      operationType,
      operationName,
      variables,
      selectionSet
    } = operation;

    const typeCase = this.getTypeCasesForSelectionSet(selectionSet);
    const variants = typeCase.exhaustiveVariants;

    let exportedTypeAlias;
    if (variants.length === 1) {
      console.log('Single variant for', operationName);
      exportedTypeAlias = this.exportDeclaration(
        this.typeAliasObject(operationName, [])
      );
    } else {
      console.log('Multiple variants for', operationName);
      console.log(this.typeAliasObjectUnion(operationName, []));
    }

    const operationTypeAlias = exportedTypeAlias;
    this.printer.enqueue(operationTypeAlias);
  }

  private getTypeCasesForSelectionSet(selectionSet: SelectionSet) {
    return typeCaseForSelectionSet(
      selectionSet,
      this.context.options.mergeInFieldsFromFragmentSpreads
    );
  }

  private getFieldsForVariant(variant: Variant): ObjectProperty[] {
  }

  public get output() {
    return this.printer.print();
  }
}
