import {
  GraphQLError,
  getNamedType,
  isCompositeType,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLInputObjectType
} from "graphql";

import { isTypeProperSuperTypeOf } from "apollo-codegen-core/lib/utilities/graphql";

import { join } from "apollo-codegen-core/lib/utilities/printing";

import {
  packageDeclaration,
  objectDeclaration,
  caseClassDeclaration,
  escapeIdentifierIfNeeded,
  comment,
  traitDeclaration,
  propertyDeclaration
} from "./language";

import {
  caseClassNameForPropertyName,
  caseClassNameForFragmentName,
  caseClassNameForInlineFragment,
  operationClassName,
  enumCaseName,
  propertyFromLegacyField,
  propertyFromInputField
} from "./naming";

import { multilineString } from "./values";

import { possibleTypesForType, typeNameFromGraphQLType } from "./types";

import CodeGenerator from "apollo-codegen-core/lib/utilities/CodeGenerator";
import {
  LegacyCompilerContext,
  LegacyOperation,
  LegacyFragment,
  LegacyField,
  LegacyInlineFragment
} from "apollo-codegen-core/lib/compiler/legacyIR";
import { GraphQLType } from "graphql";
import { Property } from "./language";
import { GraphQLCompositeType } from "graphql";
import { createLexer } from "graphql/language";

export function generateSource(context: LegacyCompilerContext) {
  const generator = new CodeGenerator(context);

  generator.printOnNewline(
    "//  This file was automatically generated and should not be edited."
  );
  generator.printNewline();

  if (context.options.namespace) {
    packageDeclaration(generator, context.options.namespace);
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
  generator: CodeGenerator<LegacyCompilerContext, any>,
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
    operationId
  }: LegacyOperation
) {
  let objectName;
  let protocol;

  switch (operationType) {
    case "query":
      objectName = `${operationClassName(operationName)}Query`;
      protocol = "com.apollographql.scalajs.GraphQLQuery";
      break;
    case "mutation":
      objectName = `${operationClassName(operationName)}Mutation`;
      protocol = "com.apollographql.scalajs.GraphQLMutation";
      break;
    default:
      throw new GraphQLError(`Unsupported operation type "${operationType}"`);
  }

  objectDeclaration(
    generator,
    {
      objectName,
      superclass: protocol
    },
    () => {
      if (source) {
        generator.printOnNewline("val operationString =");
        generator.withIndent(() => {
          multilineString(generator, source);
        });
      }

      if (operationId) {
        operationIdentifier(generator, operationId);
      }

      if (fragmentsReferenced && fragmentsReferenced.length > 0) {
        generator.printNewlineIfNeeded();
        generator.printOnNewline(
          "val requestString: String = { operationString"
        );
        fragmentsReferenced.forEach(fragment => {
          generator.print(
            ` + ${caseClassNameForFragmentName(fragment)}.fragmentString`
          );
        });
        generator.print(" }");

        generator.printOnNewline(
          "val operation = com.apollographql.scalajs.gql(requestString)"
        );
      } else {
        generator.printOnNewline(
          "val operation = com.apollographql.scalajs.gql(operationString)"
        );
      }

      generator.printNewlineIfNeeded();

      if (variables && variables.length > 0) {
        const properties = variables.map(({ name, type }) => {
          const propertyName = escapeIdentifierIfNeeded(name);
          const typeName = typeNameFromGraphQLType(
            generator.context,
            type,
            undefined,
            undefined,
            true
          );
          const isOptional = !(
            type instanceof GraphQLNonNull || type instanceof GraphQLNonNull
          );
          return { name, propertyName, type, typeName, isOptional };
        });

        caseClassDeclaration(
          generator,
          {
            caseClassName: "Variables",
            description: "",
            params: properties.map(p => {
              return {
                name: p.propertyName,
                type: p.typeName
              };
            })
          },
          () => {}
        );
      } else {
        generator.printOnNewline("type Variables = Unit");
      }

      caseClassDeclarationForSelectionSet(generator, {
        caseClassName: "Data",
        parentType: rootType,
        fields,
        inlineFragments,
        fragmentSpreads
      });
    }
  );
}

export function caseClassDeclarationForFragment(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads,
    source
  }: LegacyFragment
) {
  const caseClassName = caseClassNameForFragmentName(fragmentName);

  caseClassDeclarationForSelectionSet(
    generator,
    {
      caseClassName,
      parentType: typeCondition,
      fields,
      inlineFragments,
      fragmentSpreads
    },
    () => {
      if (source) {
        generator.printOnNewline("val fragmentString =");
        generator.withIndent(() => {
          multilineString(generator, source);
        });
      }
    }
  );
}

export function caseClassDeclarationForSelectionSet(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    caseClassName,
    parentType,
    fields,
    inlineFragments,
    fragmentSpreads,
    viewableAs,
    parentFragments
  }: {
    caseClassName: string;
    parentType: GraphQLCompositeType;
    fields: LegacyField[];
    inlineFragments?: LegacyInlineFragment[];
    fragmentSpreads?: string[];
    viewableAs?: {
      caseClassName: string;
      properties: (LegacyField & Property)[];
    };
    parentFragments?: string[];
  },
  objectClosure?: () => void
) {
  const possibleTypes = parentType
    ? possibleTypesForType(generator.context, parentType)
    : null;

  const properties = fields
    .map(field =>
      propertyFromLegacyField(generator.context, field, caseClassName)
    )
    .filter(field => field.propertyName != "__typename");

  const fragmentSpreadSuperClasses = (fragmentSpreads || []).filter(spread => {
    const fragment = generator.context.fragments[spread];
    const alwaysDefined = isTypeProperSuperTypeOf(
      generator.context.schema,
      fragment.typeCondition,
      parentType
    );

    return alwaysDefined;
  });

  traitDeclaration(
    generator,
    {
      traitName: caseClassName,
      superclasses: [
        "scala.scalajs.js.Object",
        ...(viewableAs ? [viewableAs.caseClassName] : []),
        ...(fragmentSpreadSuperClasses || []),
        ...(parentFragments || [])
      ],
      annotations: ["scala.scalajs.js.native"]
    },
    () => {
      properties.forEach(p => {
        propertyDeclaration(generator, {
          propertyName: p.responseName,
          typeName: p.typeName
        });
      });
    }
  );

  // add types and implicit conversions
  if (inlineFragments && inlineFragments.length > 0) {
    inlineFragments.forEach(inlineFragment => {
      caseClassDeclarationForSelectionSet(generator, {
        caseClassName: caseClassNameForInlineFragment(inlineFragment),
        parentType: inlineFragment.typeCondition,
        fields: inlineFragment.fields,
        fragmentSpreads: inlineFragment.fragmentSpreads,
        viewableAs: {
          caseClassName,
          properties
        }
      });
    });
  }

  objectDeclaration(generator, { objectName: caseClassName }, () => {
    if (possibleTypes) {
      generator.printNewlineIfNeeded();
      generator.printOnNewline("val possibleTypes = scala.collection.Set(");
      generator.print(
        join(Array.from(possibleTypes).map(type => `"${String(type)}"`), ", ")
      );
      generator.print(")");
    }

    generator.printOnNewline(
      `implicit class ViewExtensions(private val orig: ${caseClassName}) extends AnyVal`
    );
    generator.withinBlock(() => {
      if (inlineFragments && inlineFragments.length > 0) {
        inlineFragments.forEach(inlineFragment => {
          const fragClass = caseClassNameForInlineFragment(inlineFragment);
          generator.printOnNewline(`def as${inlineFragment.typeCondition}`);
          generator.print(`: Option[${fragClass}] =`);
          generator.withinBlock(() => {
            generator.printOnNewline(
              `if (${fragClass}.possibleTypes.contains(orig.asInstanceOf[scala.scalajs.js.Dynamic].__typename.asInstanceOf[String])) Some(orig.asInstanceOf[${fragClass}]) else None`
            );
          });
        });
      }

      if (fragmentSpreads) {
        fragmentSpreads.forEach(s => {
          const fragment = generator.context.fragments[s];
          const alwaysDefined = isTypeProperSuperTypeOf(
            generator.context.schema,
            fragment.typeCondition,
            parentType
          );
          if (!alwaysDefined) {
            generator.printOnNewline(`def as${s}`);
            generator.print(`: Option[${s}] =`);
            generator.withinBlock(() => {
              generator.printOnNewline(
                `if (${s}.possibleTypes.contains(orig.asInstanceOf[scala.scalajs.js.Dynamic].__typename.asInstanceOf[String])) Some(orig.asInstanceOf[${s}]) else None`
              );
            });
          }
        });
      }
    });

    const fragments = (fragmentSpreads || []).map(
      f => generator.context.fragments[f]
    );
    fields
      .filter(field => isCompositeType(getNamedType(field.type)))
      .forEach(field => {
        caseClassDeclarationForSelectionSet(generator, {
          caseClassName: caseClassNameForPropertyName(field.responseName),
          parentType: getNamedType(field.type) as GraphQLCompositeType,
          fields: field.fields || [],
          inlineFragments: field.inlineFragments,
          fragmentSpreads: field.fragmentSpreads,
          parentFragments: fragments
            .filter(f => {
              return f.fields.some(o => field.responseName == o.responseName);
            })
            .map(f => {
              return (
                caseClassNameForFragmentName(f.fragmentName) +
                "." +
                caseClassNameForPropertyName(field.responseName)
              );
            })
        });
      });

    if (objectClosure) {
      objectClosure();
    }
  });
}

function operationIdentifier(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  operationId: string
) {
  if (!generator.context.options.generateOperationIds) {
    return;
  }

  generator.printNewlineIfNeeded();
  generator.printOnNewline(
    `val operationIdentifier: String = "${operationId}"`
  );
}

export function typeDeclarationForGraphQLType(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  type: GraphQLType
) {
  if (type instanceof GraphQLEnumType) {
    enumerationDeclaration(generator, type);
  } else if (type instanceof GraphQLInputObjectType) {
    caseClassDeclarationForInputObjectType(generator, type);
  }
}

function enumerationDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  type: GraphQLEnumType
) {
  const { name, description } = type;
  const values = type.getValues();

  generator.printNewlineIfNeeded();
  comment(generator, description || "");
  generator.printOnNewline(`object ${name}`);
  generator.withinBlock(() => {
    values.forEach(value => {
      comment(generator, value.description || "");
      generator.printOnNewline(
        `val ${escapeIdentifierIfNeeded(enumCaseName(value.name))} = "${
          value.value
        }"`
      );
    });
  });
  generator.printNewline();
}

function caseClassDeclarationForInputObjectType(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  type: GraphQLInputObjectType
) {
  const { name: caseClassName, description } = type;
  const fields = Object.values(type.getFields());
  const properties = fields.map(field =>
    propertyFromInputField(
      generator.context,
      field,
      generator.context.options.namespace
    )
  );

  caseClassDeclaration(
    generator,
    {
      caseClassName,
      description: description || undefined,
      params: properties.map(p => {
        return {
          name: p.propertyName,
          type: p.typeName,
          defaultValue: p.isOptional ? "None" : ""
        };
      })
    },
    () => {}
  );
}
