import {
  parse,
  validate,
  visit,
  visitWithTypeInfo,
  TypeInfo
} from 'graphql';

export default function processQueryDocument(document, schema) {
  const validationErrors = validate(schema, document);
  if (validationErrors && validationErrors.length > 0) {
    for (const error of validationErrors) {
      const source = error.source;
      const location = error.locations[0];
      console.error(`${source.name}:${location.line}: error: ${error.message}`);
    }
    throw Error("Validation of GraphQL query document failed");
  }

  const typeInfo = new TypeInfo(schema);

  function source(location) {
    return location.source.body.slice(location.start, location.end);
  }

  return visit(ast, visitWithTypeInfo(typeInfo, {
    leave: {
      Name: node => node.value,
      Document: node => node.definitions,
      OperationDefinition: ({ loc, name, operation, variableDefinitions, selectionSet }) => {
        return { name, operation, source: source(loc), variableDefinitions, selectionSet };
      },
      VariableDefinition: node => {
        const type = typeInfo.getInputType();
        return { name: node.variable, type: type };
      },
      Variable: node => node.name,
      SelectionSet: ({ selections }) => selections,
      Field: ({ kind, alias, name, arguments: args, directives, selectionSet }) => {
        const type = typeInfo.getType();
        return { kind, alias, name, type: type, selectionSet: selectionSet ? selectionSet : undefined }
      }
    }
  }));
}
