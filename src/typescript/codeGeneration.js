import {
  GraphQLError,
  getNamedType,
  isCompositeType,
  isAbstractType,
  isEqualType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  GraphQLInputObjectType
} from 'graphql'

import  { isTypeProperSuperTypeOf } from '../utilities/graphql';

import { camelCase, pascalCase } from 'change-case';
import Inflector from 'inflected';

import {
  join,
  wrap,
} from '../utilities/printing';

import CodeGenerator from '../utilities/CodeGenerator';

import {
  interfaceDeclaration,
  typeDeclaration,
  propertyDeclaration,
  unionDeclaration
} from './language';

import {
  typeNameFromGraphQLType,
} from './types';

export function generateSource(context, options) {
  const generator = new CodeGenerator(context);

  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  generator.printOnNewline('/* tslint:disable */');

  typeDeclarationForGraphQLType(context.typesUsed.forEach(type =>
    typeDeclarationForGraphQLType(generator, type)
  ));
  Object.values(context.operations).forEach(operation => {
    interfaceVariablesDeclarationForOperation(generator, operation);
    interfaceDeclarationForOperation(generator, operation);
  });
  Object.values(context.fragments).forEach(operation =>
    interfaceDeclarationForFragment(generator, operation)
  );

  generator.printOnNewline('/* tslint:enable */');
  generator.printNewline();

  return generator.output;
}

export function typeDeclarationForGraphQLType(generator, type) {
  if (type instanceof GraphQLEnumType) {
    enumerationDeclaration(generator, type);
  } else if (type instanceof GraphQLInputObjectType) {
    structDeclarationForInputObjectType(generator, type);
  }
}

function enumerationDeclaration(generator, type) {
  const { name, description } = type;
  const values = type.getValues();

  generator.printNewlineIfNeeded();
  generator.printOnNewline(description && `// ${description}`);
  generator.printOnNewline(`export type ${name} =`);
  const nValues = values.length;
  values.forEach((value, i) =>
    generator.printOnNewline(`  "${value.value}"${i === nValues-1 ? ';' : ' |'}${wrap(' // ', value.description)}`)
  );
  generator.printNewline();
}

function structDeclarationForInputObjectType(
  generator,
  type
  ) {
  const interfaceName = pascalCase(type.name);
  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, Object.values(type.getFields()));
    propertyDeclarations(generator, properties, true);
  });
}

function interfaceNameFromOperation({operationName, operationType}) {
  switch (operationType) {
    case 'query':
      return `${pascalCase(operationName)}Query`;
      break;
    case 'mutation':
      return `${pascalCase(operationName)}Mutation`;
      break;
    case 'subscription':
      return `${pascalCase(operationName)}Subscription`;
      break;
    default:
      throw new GraphQLError(`Unsupported operation type "${operationType}"`);
  }
}

export function interfaceVariablesDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    variables,
    fields,
    fragmentsReferenced,
    source,
  }
) {
  if (!variables || variables.length < 1) {
    return null;
  }
  const interfaceName = `${interfaceNameFromOperation({operationName, operationType})}Variables`;

  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, variables);
    propertyDeclarations(generator, properties, true);
  });
}

export function interfaceDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    variables,
    fields,
    fragmentSpreads,
    fragmentsReferenced,
    source,
  }
) {
  const interfaceName = interfaceNameFromOperation({operationName, operationType});
  const properties = propertiesFromFields(generator.context, fields);

  interfaceDeclaration(generator, {
    interfaceName,
    extendTypes: fragmentSpreads ? fragmentSpreads.map(f => `${pascalCase(f)}Fragment`) : null,
  }, () => {
    propertyDeclarations(generator, properties, true);
  });

  properties.forEach(property => {
    if (property.inlineFragments.length > 0) {
      const fragmentName = `${pascalCase(property.bareTypeName)}Fragment`;
      handleInlineFragments(generator, fragmentName, property.inlineFragments);
    }
  });
}

export function interfaceDeclarationForFragment(
  generator,
  {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads,
    source,
    possibleTypes
  }
) {
  const interfaceName = `${pascalCase(fragmentName)}Fragment`;

  if (inlineFragments.length > 0) {
    handleInlineFragments(generator, interfaceName, inlineFragments);
  } else {
    interfaceDeclaration(generator, {
      interfaceName,
      extendTypes: fragmentSpreads ? fragmentSpreads.map(f => `${pascalCase(f)}Fragment`) : null,
    }, () => {
      const properties = propertiesFromFields(generator.context, fields)
      propertyDeclarations(generator, properties, true);
    });
  }
}

export function propertiesFromFields(context, fields, forceNullable) {
  return fields.map(field => propertyFromField(context, field, forceNullable));
}

export function propertyFromField(context, field, forceNullable) {
  let { name: fieldName, type: fieldType, description, fragmentSpreads, inlineFragments } = field;
  fieldName = fieldName || field.responseName;

  const propertyName = fieldName;

  let property = { fieldName, fieldType, propertyName, description, inlineFragments };

  const namedType = getNamedType(fieldType);

  if (isCompositeType(namedType)) {
    let typeName, bareTypeName;
    if (propertyName === '__typename') {
      // Handle the __typename field specially. the fieldType is set
      // to the parentType but we want the flow type to be a string literal
      // of the parentType.
      bareTypeName = `"${fieldType}"`;
      typeName = `"${fieldType}"`;
    } else {
      bareTypeName = pascalCase(Inflector.singularize(propertyName));
      if (property.inlineFragments && property.inlineFragments.length > 0) {
        typeName = typeNameFromGraphQLType(context, fieldType, `${bareTypeName}Fragment`);
      } else {
        typeName = typeNameFromGraphQLType(context, fieldType, bareTypeName);
      }
    }
    let isArray = false;
    if (fieldType instanceof GraphQLList) {
      isArray = true;
    } else if (fieldType instanceof GraphQLNonNull && fieldType.ofType instanceof GraphQLList) {
      isArray = true
    }
    let isNullable = true;
    if (fieldType instanceof GraphQLNonNull && !forceNullable) {
      isNullable = false;
    }
    return {
      ...property,
      typeName, bareTypeName, fields: field.fields, isComposite: true, fragmentSpreads, inlineFragments, fieldType,
      isArray, isNullable,
    };
  } else {
    const typeName = fieldName === '__typename' ?
      typeNameFromGraphQLType(context, null, fieldType, false) :
      typeNameFromGraphQLType(context, fieldType);

    return { ...property, typeName, isComposite: false, fieldType };
  }
}

export function propertyDeclarations(generator, properties, inInterface) {
  if (!properties) return;
  properties.forEach(property => {
    if (property.fields && property.fields.length > 0 || property.inlineFragments && property.inlineFragments.length > 0) {
      if (property.inlineFragments.length > 0) {
        propertyDeclaration(generator, {
          ...property,
          inInterface,
        });
      } else {
        propertyDeclaration(generator, {...property, inInterface}, () => {
          const properties = propertiesFromFields(generator.context, property.fields)
          propertyDeclarations(generator, properties);
        });
      }
    } else {
      propertyDeclaration(generator, {...property, inInterface});
    }
  });
}

function makeTypenameField(stringLiteralType) {
  return {
    responseName: '__typename',
    fieldName: '__typename',
    type: stringLiteralType,
  };
}

function handleInlineFragments(generator, fragmentName, inlineFragments) {
  let typeNames = [];
  inlineFragments.forEach(inlineFragment => {
    const typeName = `${fragmentName}On${inlineFragment.typeCondition}`;
    typeNames.push(typeName);

    const hasTypenameField = inlineFragment.fields
      .find(field => field.fieldName === '__typename' || field.responseName === '__typename');

    let fields = inlineFragment.fields;
    if (hasTypenameField) {
      fields = fields.filter(field => field.fieldName !== '__typename' || field.responseName !== '__typename');
    }

    if (generator.context.addTypename || hasTypenameField) {
      fields.unshift(makeTypenameField(inlineFragment.typeCondition));
    }

    let properties = propertiesFromFields(generator.context, fields);

    interfaceDeclaration(generator, {
      interfaceName: typeName,
    }, () => {
      propertyDeclarations(generator, properties, true);
    });

    properties.forEach(property => {
      if (property.inlineFragments && property.inlineFragments.length > 0) {
        const innerFragmentName = `${property.bareTypeName}Fragment`;
        handleInlineFragments(generator, innerFragmentName, property.inlineFragments);
      }
    });
  });

  // TODO: Refactor typeDeclaration to not automatically assume bracketed type
  typeDeclaration(generator, { interfaceName: fragmentName, noBrackets: true }, () => {
    unionDeclaration(generator, typeNames);
  });
}
