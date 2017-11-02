import {
  GraphQLEnumType,
  GraphQLInputObjectType,
} from 'graphql';

import { typeAnnotationFromGraphQLType } from './helpers';

import * as t from 'babel-types';

type ObjectProperty = {
  name: string,
  annotation: t.TypeAnnotation
}

export default class FlowGenerator {
  public enumerationDeclaration(type: GraphQLEnumType) {
    const { name, description } = type;
    const unionValues = type.getValues().map(({ value }) => {
      const type = t.stringLiteralTypeAnnotation();
      // $ts-ignore - definition is incomplete
      type.value = value;

      return type;
    });

    const typeAlias = t.exportNamedDeclaration(
      t.typeAlias(
        t.identifier(name),
        undefined,
        t.unionTypeAnnotation(unionValues)
      ),
      []
    );

    typeAlias.leadingComments = [{
      // $ts-ignore
      type: 'CommentLine',
      value: ` ${description}`
    }];

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
          annotation: typeAnnotationFromGraphQLType(field.type)
        }
      });

    const typeAlias = this.typeAliasObject(name, fields);

    typeAlias.leadingComments = [{
      // $ts-ignore
      type: 'CommentLine',
      value: ` ${description}`
    }]

    return typeAlias;
  }

  public objectTypeAnnotation(fields: ObjectProperty[]) {
    return t.objectTypeAnnotation(
      fields.map(({name, annotation}) => {
        return t.objectTypeProperty(
          t.identifier(name),
          annotation
        );
      })
    )
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

  public exportDeclaration(node: t.Node) {
    return t.exportNamedDeclaration(node, []);
  }

  public annotationFromScopeStack(scope: string[]) {
    return t.genericTypeAnnotation(
      t.identifier(
        scope.join('_')
      )
    );
  }
}
