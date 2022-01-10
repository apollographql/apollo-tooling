import { GraphQLScalarType, GraphQLType, isScalarType } from "graphql";
import * as doc from "doctrine";
import * as t from "@babel/types";

const isAnonymousType = (t: doc.Tag) => t.title === "type";

export const parseGQLScalarJSDOC = (gqlType: GraphQLType): doc.Tag[] => {
  if (!isScalarType(gqlType)) {
    return [];
  }

  const { tags = [], description } =
    doc.parse(gqlType.description || "", { unwrap: true }) || {};

  const [targetType, ...anonymousTypes] = tags.filter(isAnonymousType);

  if (anonymousTypes.length > 0) {
    throw new Error("only one anonymous type per annotation is permitted");
  }

  return targetType
    ? [
        ...tags.filter(x => !isAnonymousType(x)),
        { name: gqlType.name, ...targetType, description }
      ]
    : [];
};

// fixes bug in @types/doctrine
type JSDocType = doc.Type | { type: "StringLiteralType"; value: string };

const isNotUndefined = <T>(t: T | undefined): t is T => Boolean(t);

const inferFieldType = (f: doc.Type): t.TSPropertySignature | undefined =>
  f.type === "FieldType" && f.value
    ? t.TSPropertySignature(
        t.identifier(f.key),
        t.TSTypeAnnotation(inferJSDocType(f.value))
      )
    : undefined;

const inferCollectionType = ([type, ...types]: t.TSType[]) =>
  types.length === 0
    ? t.TSArrayType(type)
    : t.TSTupleType([type, ...types]);

const inferJSDocType = (docType: JSDocType): t.TSType => {
  switch (docType.type) {
    case "StringLiteralType":
      return t.TSLiteralType(t.stringLiteral(docType.value));
    case "NameExpression":
      return t.TSTypeReference(t.identifier(docType.name));
    case "UnionType":
      return t.TSUnionType(docType.elements.map(inferJSDocType));
    case "RecordType":
      return t.TSTypeLiteral(
        docType.fields.map(inferFieldType).filter(isNotUndefined)
      );
    case "NonNullableType":
      return inferJSDocType(docType.expression)
    case "VoidLiteral": return t.TSVoidKeyword()
    // null | undefined keyword
    case "UndefinedLiteral":
    case "NullLiteral":
    case "NullableLiteral": return t.TSUndefinedKeyword()
    // nullable Types
    case "NullableType":
    case "OptionalType":
      return t.TSUnionType([
        inferJSDocType(docType.expression),
        t.TSUndefinedKeyword()
      ]);

    case "ArrayType":
      return inferCollectionType(docType.elements.map(inferJSDocType));
    default:
      throw new Error(`Unsupported TSDoc Type : ${JSON.stringify(docType)}`);
  }
};

export type GQLScalarAnnotationType = {
  name: string;
  type: t.TSType;
};

export const inferGQLScalarAnnotations = (
  type: GraphQLType
): GQLScalarAnnotationType[] =>
  parseGQLScalarJSDOC(type)
    .map(({ type, name, description }) =>
      type && name ? { name, type: inferJSDocType(type) } : undefined
    )
    .filter(isNotUndefined);

export const isTypeAnnotatedScalar = (
  type: GraphQLType
): type is GraphQLScalarType => parseGQLScalarJSDOC(type).length > 0;
