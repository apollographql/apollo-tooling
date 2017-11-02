import {
  GraphQLEnumType,
  GraphQLInputObjectType,
} from 'graphql';

import { typeAnnotationFromGraphQLType } from './helpers';

import * as t from '@babel/types';

type ObjectProperty = {
  name: string,
  description?: ?string,
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

  public objectTypeAnnotation(fields: ObjectProperty[], isInputObject: boolean = false) {
    const objectTypeAnnotation = t.objectTypeAnnotation(
      fields.map(({name, description, annotation}) => {
        if (annotation.type instanceof t.NullableTypeAnnotation) {
          t.identifier(name + '?')
        }

        const objectTypeProperty = t.objectTypeProperty(
          t.identifier(
            // Nullable fields on input objects do not have to be defined
            // as well, so allow these fields to be "undefined"
            (isInputObject && annotation.type === "NullableTypeAnnotation")
              ? name + '?'
              : name
          ),
          annotation
        );

        if (description) {
          objectTypeProperty.leadingComments = [{
            type: 'CommentLine',
            value: ` ${description}`
          }]
        }

        return objectTypeProperty;
      })
    );

    objectTypeAnnotation.exact = true;

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
