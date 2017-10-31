import * as t from 'babel-types';

export default class FlowGenerator {
  enumerationDeclaration(type: GraphQLType) {
    const { name, description } = type;
    const values = type.getValues();

    const unionValues = values.map(v => {
      const type = t.stringLiteralTypeAnnotation();
      type.value = v.value;
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
      type: 'CommentLine',
      value: ` ${description}`
    }];

    return typeAlias;
  }
}
