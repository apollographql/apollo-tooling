import {
  GraphQLEnumType,
  GraphQLInputObjectType
} from 'graphql';

import {
  CompilerOptions
} from 'apollo-codegen-core/lib/compiler';


import {
  sortEnumValues
} from 'apollo-codegen-core/lib/utilities/graphql';

import { createTypeFromGraphQLTypeFunction,  } from './helpers';

import * as t from '@babel/types';

export type ObjectProperty = {
  name: string,
  description?: string | null | undefined,
  type: t.TSType
}

export interface TypescriptCompilerOptions extends CompilerOptions {
  // Leaving this open for Typescript only compiler options
}

export default class TypescriptGenerator {
  options: TypescriptCompilerOptions
  typeFromGraphQLType: Function

  constructor(compilerOptions: TypescriptCompilerOptions) {
    this.options = compilerOptions;

    this.typeFromGraphQLType = createTypeFromGraphQLTypeFunction(compilerOptions);
  }

  public enumerationDeclaration(type: GraphQLEnumType) {
    const { name, description } = type;
    const enumMembers = sortEnumValues(type.getValues()).map(({ value }) => {
      return t.TSEnumMember(
        t.identifier(value),
        t.stringLiteral(value)
      );
    });

    const typeAlias = t.exportNamedDeclaration(
      t.TSEnumDeclaration(
        t.identifier(name),
        enumMembers
      ),
      []
    );

    if (description) {
      typeAlias.leadingComments = [{
        type: 'CommentLine',
        value: ` ${description.replace(new RegExp('\n', 'g'), ' ')}`
      } as t.CommentLine];
    }

    return typeAlias;
  }

  public inputObjectDeclaration(inputObjectType: GraphQLInputObjectType) {
    const { name, description } = inputObjectType;

    const fieldMap = inputObjectType.getFields();
    const fields: ObjectProperty[] = Object.keys(inputObjectType.getFields())
      .map((fieldName: string) => {
        const field = fieldMap[fieldName];
        return {
          name: fieldName,
          type: this.typeFromGraphQLType(field.type)
        }
      });

    const inputType = t.exportNamedDeclaration(this.interface(name, fields, {
      keyInheritsNullability: true
    }), []);

    inputType.leadingComments = [{
      type: 'CommentLine',
      value: ` ${description}`
    } as t.CommentLine]

    return inputType;
  }

  public typesForProperties(fields: ObjectProperty[], {
    keyInheritsNullability = false
  } : {
    keyInheritsNullability?: boolean
  } = {}) {

    return fields.map(({name, description, type}) => {
      const propertySignatureType = t.TSPropertySignature(
        t.identifier(name),
        t.TSTypeAnnotation(type)
      );

      // TODO: Check if this works
      propertySignatureType.optional = keyInheritsNullability && this.isNullableType(type);

      if (description) {
        propertySignatureType.trailingComments = [{
          type: 'CommentLine',
          value: ` ${description.replace(new RegExp('\n', 'g'), ' ')}`
        } as t.CommentLine]
      }

      return propertySignatureType;
    });
  }

  public interface(name: string, fields: ObjectProperty[], {
    keyInheritsNullability = false
  }: {
    keyInheritsNullability?: boolean
  } = {}) {

    return t.TSInterfaceDeclaration(
      t.identifier(name),
      undefined,
      undefined,
      t.TSInterfaceBody(
        this.typesForProperties(fields, {
          keyInheritsNullability
        })
      )
    );
  }

  public typeAliasGenericUnion(name: string, members: t.TSType[]) {
    return t.TSTypeAliasDeclaration(
      t.identifier(name),
      undefined,
      t.TSUnionType(
        members
      )
    );
  }

  public exportDeclaration(declaration: t.Declaration) {
    return t.exportNamedDeclaration(declaration, []);
  }

  public nameFromScopeStack(scope: string[]) {
    return scope.join('_');
  }

  public makeNullableType(type: t.TSType) {
    return t.TSUnionType([
      type,
      t.TSNullKeyword()
    ])
  }

  public isNullableType(type: t.TSType) {
    return t.isTSUnionType(type) && type.types.some(type => t.isTSNullKeyword(type));
  }
}
