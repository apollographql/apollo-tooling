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

import  { isTypeProperSuperTypeOf } from '../utilities/graphql'

import {
  join,
  wrap,
} from '../utilities/printing';

import {
  packageDeclaration,
  objectDeclaration,
  caseClassDeclaration,
  propertyDeclaration,
  propertyDeclarations,
  escapeIdentifierIfNeeded,
  comment
} from './language';

import {
  caseClassNameForPropertyName,
  caseClassNameForFragmentName,
  caseClassNameForInlineFragment,
  operationClassName,
  enumCaseName,
  propertiesFromSelectionSet,
  propertyFromField,
  propertyFromInlineFragment,
  propertyFromFragmentSpread
} from './naming';

import {
  escapedString,
  multilineString,
  dictionaryLiteralForFieldArguments,
} from './values';

import {
  possibleTypesForType,
  typeNameFromGraphQLType,
} from './types';

import CodeGenerator from '../utilities/CodeGenerator';

export function generateSource(context, options) {
  const generator = new CodeGenerator(context);

  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  generator.printNewline();

  if (context.namespace) {
    packageDeclaration(generator, context.namespace);
  }

  context.typesUsed.forEach(type => {
    typeDeclarationForGraphQLType(generator, type);
  });

  Object.values(context.operations).forEach(operation => {
    classDeclarationForOperation(generator, operation);
  });

  Object.values(context.fragments).forEach(fragment => {
    caseClassDeclarationForFragment(generator, fragment);
  });

  return generator.output;
}

export function classDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    rootType,
    variables,
    fields,
    inlineFragments,
    fragmentSpreads,
    fragmentsReferenced,
    source,
    sourceWithFragments,
    operationId
  }
) {
  let objectName;
  let protocol;

  switch (operationType) {
    case 'query':
      objectName = `${operationClassName(operationName)}Query`;
      protocol = 'com.apollographql.scalajs.GraphQLQuery';
      break;
    case 'mutation':
      objectName = `${operationClassName(operationName)}Mutation`;
      protocol = 'com.apollographql.scalajs.GraphQLMutation';
      break;
    default:
      throw new GraphQLError(`Unsupported operation type "${operationType}"`);
  }

  objectDeclaration(generator, {
    objectName,
    modifiers: [],
    superclass: protocol
  }, () => {
    if (source) {
      generator.printOnNewline('val operationString =');
      generator.withIndent(() => {
        multilineString(generator, source);
      });
    }

    operationIdentifier(generator, { operationName, sourceWithFragments, operationId });

    if (fragmentsReferenced && fragmentsReferenced.length > 0) {
      generator.printNewlineIfNeeded();
      generator.printOnNewline('val requestString: String = { operationString');
      fragmentsReferenced.forEach(fragment => {
        generator.print(` + ${caseClassNameForFragmentName(fragment)}.fragmentString`)
      });
      generator.print(' }');

      generator.printOnNewline('val operation = com.apollographql.scalajs.gql(requestString)');
    } else {
      generator.printOnNewline('val operation = com.apollographql.scalajs.gql(operationString)');
    }

    generator.printNewlineIfNeeded();

    if (variables && variables.length > 0) {
      const properties = variables.map(({ name, type }) => {
        const propertyName = escapeIdentifierIfNeeded(name);
        const typeName = typeNameFromGraphQLType(generator.context, type);
        const isOptional = !(type instanceof GraphQLNonNull || type.ofType instanceof GraphQLNonNull);
        return { name, propertyName, type, typeName, isOptional };
      });

      caseClassDeclaration(generator, { caseClassName: 'Variables', description: '', params: properties.map(p => {
        return {
          name: p.propertyName,
          type: p.typeName
        };
      })}, () => {});
    } else {
      generator.printOnNewline('type Variables = Unit');
    }

    caseClassDeclarationForSelectionSet(
      generator,
      {
        caseClassName: "Data",
        parentType: rootType,
        fields,
        inlineFragments,
        fragmentSpreads
      }
    );
  });
}

export function caseClassDeclarationForFragment(
  generator,
  {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads,
    source
  }
) {
  const caseClassName = caseClassNameForFragmentName(fragmentName);

  caseClassDeclarationForSelectionSet(generator, {
    caseClassName,
    parentType: typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads
  }, () => {}, () => {
    if (source) {
      generator.printOnNewline('val fragmentString =');
      generator.withIndent(() => {
        multilineString(generator, source);
      });
    }
  });
}

export function caseClassDeclarationForSelectionSet(
  generator,
  {
    caseClassName,
    parentType,
    fields,
    inlineFragments,
    fragmentSpreads,
    viewableAs
  },
  beforeClosure,
  objectClosure,
) {
  const possibleTypes = parentType ? possibleTypesForType(generator.context, parentType) : null;

  let properties;

  if (!possibleTypes || possibleTypes.length == 1) {
    properties = fields
      .map(field => propertyFromField(generator.context, field))
      .filter(field => field.propertyName != "__typename");

    caseClassDeclaration(generator, { caseClassName, params: properties.map(p => {
      return {
        name: p.responseName,
        type: p.typeName,
      };
    }) }, () => {});
  } else {
    generator.printNewlineIfNeeded();
    const properties = fields
      .map(field => propertyFromField(generator.context, field))
      .filter(field => field.propertyName != "__typename");

    caseClassDeclaration(generator, { caseClassName, params: properties.map(p => {
      return {
        name: p.responseName,
        type: p.typeName,
      };
    }), superclass: 'me.shadaj.slinky.core.WithRaw'}, () => {
      if (inlineFragments && inlineFragments.length > 0) {
        inlineFragments.forEach((inlineFragment) => {
          const fragClass = caseClassNameForInlineFragment(inlineFragment);
          generator.printOnNewline(`def as${inlineFragment.typeCondition}`);
          generator.print(`: Option[${fragClass}] =`);
          generator.withinBlock(() => {
            generator.printOnNewline(`if (${fragClass}.possibleTypes.contains(this.raw.__typename.asInstanceOf[String])) Some(implicitly[me.shadaj.slinky.core.Reader[${fragClass}]].read(this.raw)) else None`);
          });
        });
      }

      if (fragmentSpreads) {
        fragmentSpreads.forEach(s => {
          const fragment = generator.context.fragments[s];
          const alwaysDefined = isTypeProperSuperTypeOf(generator.context.schema, fragment.typeCondition, parentType);
          if (!alwaysDefined) {
            generator.printOnNewline(`def as${s}`);
            generator.print(`: Option[${s}] =`);
            generator.withinBlock(() => {
              generator.printOnNewline(`if (${s}.possibleTypes.contains(this.raw.__typename.asInstanceOf[String])) Some(implicitly[me.shadaj.slinky.core.Reader[${s}]].read(this.raw)) else None`);
            });
          }
        })
      }
    });

    // add types and implicit conversions
    if (inlineFragments && inlineFragments.length > 0) {
      inlineFragments.forEach((inlineFragment) => {
        caseClassDeclarationForSelectionSet(
          generator,
          {
            caseClassName: caseClassNameForInlineFragment(inlineFragment),
            parentType: inlineFragment.typeCondition,
            fields: inlineFragment.fields,
            inlineFragments: inlineFragment.inlineFragments,
            fragmentSpreads: inlineFragment.fragmentSpreads,
            viewableAs: {
              caseClassName,
              properties,
            },
          }
        );
      });
    }
  }

  objectDeclaration(generator, { objectName: caseClassName }, () => {
    if (possibleTypes) {
      generator.printNewlineIfNeeded();
      generator.printOnNewline('val possibleTypes = scala.collection.Set(');
      generator.print(join(possibleTypes.map(type => `"${String(type)}"`), ', '));
      generator.print(')');
    }

    if (viewableAs) {
      generator.printOnNewline(`implicit def to${viewableAs.caseClassName}(a: ${caseClassName}): ${viewableAs.caseClassName} = ${viewableAs.caseClassName}(${viewableAs.properties.map(p => "a." + p.responseName).join(', ')})`);
    }

    if (fragmentSpreads) {
      fragmentSpreads.forEach(s => {
        const fragment = generator.context.fragments[s];
        const alwaysDefined = isTypeProperSuperTypeOf(generator.context.schema, fragment.typeCondition, parentType);
        if (alwaysDefined) {
          generator.printOnNewline(`implicit def to${s}(a: ${caseClassName}): ${s} = ${s}(${(fragment.fields || []).map(p => "a." + p.responseName).join(', ')})`);
        }
      })
    }

    if (objectClosure) {
      objectClosure();
    }
  });

  fields.filter(field => isCompositeType(getNamedType(field.type))).forEach(field => {
    caseClassDeclarationForSelectionSet(
      generator,
      {
        caseClassName: caseClassNameForPropertyName(field.responseName),
        parentType: getNamedType(field.type),
        fields: field.fields,
        inlineFragments: field.inlineFragments,
        fragmentSpreads: field.fragmentSpreads
      }
    );
  });
}

function operationIdentifier(generator,  { operationName, sourceWithFragments, operationId }) {
  if (!generator.context.generateOperationIds) {
    return
  }

  generator.printNewlineIfNeeded();
  generator.printOnNewline(`val operationIdentifier: String = "${operationId}"`);
}

export function typeDeclarationForGraphQLType(generator, type) {
  if (type instanceof GraphQLEnumType) {
    enumerationDeclaration(generator, type);
  } else if (type instanceof GraphQLInputObjectType) {
    caseClassDeclarationForInputObjectType(generator, type);
  }
}

function enumerationDeclaration(generator, type) {
  const { name, description } = type;
  const values = type.getValues();

  generator.printNewlineIfNeeded();
  comment(generator, description);
  generator.printOnNewline(`object ${name}`);
  generator.withinBlock(() => {
    values.forEach(value => {
      comment(generator, value.description);
      generator.printOnNewline(`val ${escapeIdentifierIfNeeded(enumCaseName(value.name))} = "${value.value}"`);
    });
  });
  generator.printNewline();
}

function caseClassDeclarationForInputObjectType(generator, type) {
  const { name: caseClassName, description } = type;
  const fields = Object.values(type.getFields());
  const properties = fields.map(field => propertyFromField(generator.context, field));

  caseClassDeclaration(generator, { caseClassName, description, params: properties.map(p => {
    return {
      name: p.propertyName,
      type: p.typeName
    };
  })}, () => {});
}
