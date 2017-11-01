import {
  GraphQLEnumType,
  GraphQLInputObjectType,
} from 'graphql';

import * as t from 'babel-types';

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

  public inputObjectDeclaration(type: GraphQLInputObjectType) {
    const { name, description } = type;
    const typeAlias = t.exportNamedDeclaration(
      t.typeAlias(
        t.identifier(name),
        undefined,
        t.objectTypeAnnotation(
          Object.keys(type.getFields()).map((fieldName) => {
            return t.objectTypeProperty(
              t.identifier(fieldName),
              t.anyTypeAnnotation()
            );
          })
        )
      ),
      []
    );

    typeAlias.leadingComments = [{
      // $ts-ignore
      type: 'CommentLine',
      value: ` ${description}`
    }]

    return typeAlias;
  }
}
