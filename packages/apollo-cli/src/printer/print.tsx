import { uniqBy } from "lodash";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  print,
  GraphQLSchema,
  GraphQLEnumValue,
  GraphQLFieldMap,
  GraphQLField,
  GraphQLInputObjectType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  GraphQLScalarType,
  GraphQLUnionType,
  ASTKindToNode,
  FieldDefinitionNode,
  EnumValueDefinitionNode,
  ObjectTypeDefinitionNode,
  InputObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  EnumTypeDefinitionNode,
  UnionTypeDefinitionNode,
} from "graphql";

import {
  ChangeType,
  Change,
  TypeKind,
  DiffType,
  DiffField,
  DiffEnum,
} from "./ast";
import * as decode from "decode-html";

import { diffSchemas } from "./diff";

import { f, w, n } from "./emoji";

const Field: React.SFC<{ field: FieldDefinitionNode }> = ({ field }) => (
  <>{print(field)}</>
);
const Value: React.SFC<{ value: EnumValueDefinitionNode }> = ({ value }) => (
  <>{print(value)}</>
);

const nameFromKind = (kind: string) => {
  switch (kind) {
    case TypeKind.ENUM:
      return "enum";
    case TypeKind.OBJECT:
      return "type";
    case TypeKind.INPUT_OBJECT:
      return "input";
    case TypeKind.SCALAR:
      return "scalar";
    case TypeKind.INTERFACE:
      return "interface";
    case TypeKind.UNION:
      return "union";
  }
};
const Fields: React.SFC<{
  name: string;
  fields: FieldDefinitionNode[];
}> = ({ name, fields }) =>
  fields.length > 0 ? (
    <>
      {"\n"}
      {"  "}
      <Header name={name} />
      {fields.map((field, i) => (
        <React.Fragment key={i}>
          {"  "}
          <Field field={field} key={i} />
          {"\n"}
        </React.Fragment>
      ))}
    </>
  ) : null;

const Values: React.SFC<{
  name: string;
  values: EnumValueDefinitionNode[];
}> = ({ name, values }) =>
  values.length > 0 ? (
    <>
      {"\n"}
      {"  "}
      <Header name={name} />
      {values.map((value, i) => (
        <React.Fragment key={i}>
          {"  "}
          <Value value={value} key={i} />
          {"\n"}
        </React.Fragment>
      ))}
    </>
  ) : null;

const removals = ["TYPE_REMOVED"];
const Type: React.SFC<{ change: Change }> = ({ change }) => {
  const type = change.type;
  if (!type) return null;
  const typeName = nameFromKind(type.kind);
  switch (type.kind) {
    case TypeKind.UNION:
      const t = change.type as UnionTypeDefinitionNode;
      if (!t.types) return null;
      const types = t.types.map(({ name }) => name.value);
      return (
        <>
          {typeName} {type.name.value} = {types.join(" | ")}
          {"\n"}
        </>
      );
    case TypeKind.SCALAR:
      return (
        <>
          {typeName} {type.name.value}
          {"\n"}
        </>
      );
    case TypeKind.ENUM: {
      const t = type as EnumTypeDefinitionNode;

      const values = t.values as DiffEnum[];

      const failure = values.filter(
        ({ change }) => change && change.change === ChangeType.FAILURE
      );
      const warning = values.filter(
        ({ change }) => change && change.change === ChangeType.WARNING
      );
      const notice = values.filter(
        ({ change }) => change && change.change === ChangeType.NOTICE
      );

      return (
        <>
          {typeName} {type.name.value}
          {" { "}
          {removals.includes(change.code) ? null : change.code ===
          "TYPE_ADDED" ? (
            <>
              {"\n  "}
              <Values name={`${n} Notice ${n}`} values={values} />
              {"\n"}
            </>
          ) : (
            <>
              {"\n  "}
              <Values name={`${f} Failure ${f}`} values={failure} />
              <Values name={`${w} Warning ${w}`} values={warning} />
              <Values name={`${n} Notice ${n}`} values={notice} />
              {"\n"}
            </>
          )}
          {"}\n"}
        </>
      );
    }
    case TypeKind.INTERFACE:
    case TypeKind.OBJECT:
    case TypeKind.INPUT_OBJECT: {
      const t = type as
        | ObjectTypeDefinitionNode
        | InterfaceTypeDefinitionNode
        | InputObjectTypeDefinitionNode;

      const fields: DiffField[] = t.fields
        ? (t as ObjectTypeDefinitionNode).fields!.filter(
            ({ change }: DiffField) => change
          )
        : [];

      const failure = fields.filter(
        ({ change }) => change!.change === ChangeType.FAILURE
      );
      const warning = fields.filter(
        ({ change }) => change!.change === ChangeType.WARNING
      );
      const notice = fields.filter(
        ({ change }) => change!.change === ChangeType.NOTICE
      );
      const interfaces = (t as ObjectTypeDefinitionNode).interfaces
        ? (t as ObjectTypeDefinitionNode).interfaces!
        : [];
      const implementedInterfaces = interfaces.length
        ? " implements " +
          interfaces.map(({ name }: any) => name.value).join(" & ")
        : "";

      return (
        <>
          {typeName} {t.name.value}
          {implementedInterfaces}
          {" { "}
          {removals.includes(change.code) ||
          (change.code !== "TYPE_ADDED" &&
            fields.length === 0) ? null : change.code === "TYPE_ADDED" ? (
            <>
              {"\n  "}
              <Fields
                name={`${n} Notice ${n}`}
                fields={t.fields as DiffField[]}
              />
              {"\n"}
            </>
          ) : (
            <>
              {"\n  "}
              <Fields name={`${f} Failure ${f}`} fields={failure} />
              <Fields name={`${w} Warning ${w}`} fields={warning} />
              <Fields name={`${n} Notice ${n}`} fields={notice} />
              {"\n"}
            </>
          )}
          {"}\n"}
        </>
      );
    }
    default:
      return null;
  }
};

const Header: React.SFC<{ name: string }> = ({ name }) => (
  <>{"# " + name + "\n"}</>
);

const Schema: React.SFC<{ changes: Change[] }> = ({ changes }) => {
  const failure = changes.filter(({ change }) => change === ChangeType.FAILURE);

  const warning = uniqBy(
    changes.filter(
      ({ change, type }) =>
        change === ChangeType.WARNING &&
        !failure.find(x => Boolean(type && x.type && x.type.name === type.name))
    ),
    "type"
  );

  const notice = changes.filter(
    ({ change, type }) =>
      change === ChangeType.NOTICE &&
      !failure.find(x =>
        Boolean(type && x.type && x.type.name === type.name)
      ) &&
      !warning.find(x => Boolean(type && x.type && x.type.name === type.name))
  );

  return (
    <>
      {failure.length > 0 && (
        <>
          {failure.map((change, i) => (
            <React.Fragment key={i}>
              <Type change={change} key={i} />
              {"\n"}
            </React.Fragment>
          ))}
        </>
      )}
      {warning.length > 0 && (
        <>
          {warning.map((change, i) => (
            <React.Fragment key={i}>
              <Type change={change} key={i} />
              {"\n"}
            </React.Fragment>
          ))}
        </>
      )}
      {notice.length > 0 && (
        <>
          {notice.map((change, i) => (
            <React.Fragment key={i}>
              <Type change={change} key={i} />
              {"\n"}
            </React.Fragment>
          ))}
        </>
      )}
    </>
  );
};

export const printChanges = (changes: Change[]) =>
  renderToStaticMarkup(<Schema changes={changes} />);

export const printFromSchemas = (
  current: GraphQLSchema,
  next: GraphQLSchema
) => {
  const currentTypeMap = current.getTypeMap();
  const newTypeMap = next.getTypeMap();

  const changes = diffSchemas(currentTypeMap, newTypeMap);
  // replace SSR santiaztion with pretty print
  return decode(renderToStaticMarkup(<Schema changes={changes} />));
};
