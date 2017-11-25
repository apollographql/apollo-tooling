import {
  GraphQLEnumType,
  GraphQLInputObjectType,
} from 'graphql';

import {
  CompilerOptions
} from '../../compiler';

import { createTypeAnnotationFromGraphQLTypeFunction } from './helpers';

import * as t from '@babel/types';

export type ObjectProperty = {
  name: string,
  description?: string | null | undefined,
  annotation: t.FlowTypeAnnotation
}

export interface TypescriptCompilerOptions extends CompilerOptions {
  // Leaving this open for Typescript only compiler options
}

export default class TypescriptGenerator {
  options: TypescriptCompilerOptions
  typeAnnotationFromGraphQLType: Function

  constructor(compilerOptions: TypescriptCompilerOptions) {
    this.options = compilerOptions;

    this.typeAnnotationFromGraphQLType = createTypeAnnotationFromGraphQLTypeFunction(compilerOptions);
  }

  public enumerationDeclaration(type: GraphQLEnumType) {
    const { name, description } = type;
    const enumMembers = type.getValues().map(({ value }) => {
      // @ts-ignore
      return t.tSEnumMember(
        t.identifier(value),
        t.stringLiteral(value)
      );
    });

    const typeAlias = t.exportNamedDeclaration(
      // @ts-ignore
      t.tSEnumDeclaration(
        t.identifier(name),
        enumMembers
      ),
      []
    );

    typeAlias.leadingComments = [{
      type: 'CommentLine',
      value: ` ${description}`
    } as t.CommentLine];

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
          annotation: this.typeAnnotationFromGraphQLType(field.type)
        }
      });

    const typeAlias = this.typeAliasObject(name, fields);

    typeAlias.leadingComments = [{
      type: 'CommentLine',
      value: ` ${description}`
    } as t.CommentLine]

    return typeAlias;
  }

  public objectTypeAnnotation(fields: ObjectProperty[], isInputObject: boolean = false) {
    const objectTypeAnnotation = t.objectTypeAnnotation(
      fields.map(({name, description, annotation}) => {
        const objectTypeProperty = t.objectTypeProperty(
          t.identifier(
            // Nullable fields on input objects do not have to be defined
            // as well, so allow these fields to be "undefined"
            (isInputObject && annotation.type === "NullableTypeAnnotation")
              ? name + '?'
              : name
          ),
          annotation.type === "NullableTypeAnnotation"
            ? this.makeNullableAnnotation(annotation.typeAnnotation)
            : annotation
        );

        if (description) {
          objectTypeProperty.trailingComments = [{
            type: 'CommentLine',
            value: ` ${description}`
          } as t.CommentLine]
        }

        return objectTypeProperty;
      })
    );

    return objectTypeAnnotation;
  }

  public typeAliasObject(name: string, fields: ObjectProperty[]) {
    return t.typeAlias(
      t.identifier(name),
      undefined,
      this.objectTypeAnnotation(fields)
    );
  }

  public typeAliasObjectUnion(name: string, members: ObjectProperty[][]) {
    return t.typeAlias(
      t.identifier(name),
      undefined,
      t.unionTypeAnnotation(
        members.map(member => {
          return this.objectTypeAnnotation(member)
        })
      )
    )
  }

  public typeAliasGenericUnion(name: string, members: t.FlowTypeAnnotation[]) {
    return t.typeAlias(
      t.identifier(name),
      undefined,
      t.unionTypeAnnotation(members)
    );
  }

  public exportDeclaration(declaration: t.Declaration) {
    return t.exportNamedDeclaration(declaration, []);
  }

  public annotationFromScopeStack(scope: string[]) {
    return t.genericTypeAnnotation(
      t.identifier(
        scope.join('_')
      )
    );
  }

  public makeNullableAnnotation(annotation: t.FlowTypeAnnotation) {
    return t.unionTypeAnnotation([
      annotation,
      // @ts-ignore
      t.tSUndefinedKeyword(),
      // @ts-ignore
      t.tSNullKeyword()
    ])
  }
}
