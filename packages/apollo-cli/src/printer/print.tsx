import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { print } from "graphql";

import { __ChangeType, __TypeKind } from "./ast";
import { diffSchemas } from "./diff";

const Field = ({ field }) => print(field);
const Value = ({ value }) => print(value);

const nameFromKind = kind => {
  switch (kind) {
    case __TypeKind.ENUM:
      return "enum";
    case __TypeKind.OBJECT:
      return "type";
    case __TypeKind.INPUT_OBJECT:
      return "input";
    case __TypeKind.SCALAR:
      return "scalar";
    case __TypeKind.INTERFACE:
      return "interface";
    case __TypeKind.UNION:
      return "union";
  }
};
const Fields = ({ name, fields }) =>
  fields.length > 0 ? (
    <>
      {"\n"}
      {"  "}
      <Header name={name} />
      {"  "}
      {fields.map((field, i) => <Field field={field} key={i} />)}
      {"\n"}
    </>
  ) : null;

const Values = ({ name, values }) =>
  values.length > 0 ? (
    <>
      {"\n"}
      {"  "}
      <Header name={name} />
      {"  "}
      {values.map((value, i) => <Value value={value} key={i} />)}
      {"\n"}
    </>
  ) : null;

const Type = ({ type, change }: { type: __Type; change: __ChangeType }) => {
  const typeName = nameFromKind(type.kind);
  switch (type.kind) {
    case __TypeKind.UNION:
      return (
        <>
          {typeName} {type.name.value} = {change.type.getTypes().join(", ")}
          {"\n"}
        </>
      );
    case __TypeKind.SCALAR:
      return (
        <>
          {typeName} {type.name.value}
          {"\n"}
        </>
      );
    case __TypeKind.ENUM: {
      const breaking = type.values.filter(
        ({ change }) => change && change.change === __ChangeType.BREAKING
      );
      const warning = type.values.filter(
        ({ change }) => change && change.change === __ChangeType.WARNING
      );
      const notice = type.values.filter(
        ({ change }) => change && change.change === __ChangeType.NOTICE
      );
      return (
        <>
          {typeName} {type.name.value}
          {" { "}
          {change.code === "TYPE_REMOVED" ? null : change.code ===
          "TYPE_ADDED" ? (
            <>
              {"\n  "}
              {type.values.map((value, i) => <Value value={value} key={i} />)}
              {"\n"}
            </>
          ) : (
            <>
              {"\n  "}
              <Values name="Breaking" values={breaking} />
              <Values name="Warning" values={warning} />
              <Values name="Notice" values={notice} />
              {"\n"}
            </>
          )}
          {"}\n"}
        </>
      );
    }
    case __TypeKind.INTERFACE:
    case __TypeKind.OBJECT:
    case __TypeKind.INPUT_OBJECT:
    default: {
      const breaking = type.fields.filter(
        ({ change }) => change && change.change === __ChangeType.BREAKING
      );
      const warning = type.fields.filter(
        ({ change }) => change && change.change === __ChangeType.WARNING
      );
      const notice = type.fields.filter(
        ({ change }) => change && change.change === __ChangeType.NOTICE
      );
      return (
        <>
          {typeName} {type.name.value}
          {" { "}
          {change.code === "TYPE_REMOVED" ? null : change.code ===
          "TYPE_ADDED" ? (
            <>
              {"\n  "}
              {type.fields.map((field, i) => <Field field={field} key={i} />)}
              {"\n"}
            </>
          ) : (
            <>
              {"\n  "}
              <Fields name="Breaking" fields={breaking} />
              <Fields name="Warning" fields={warning} />
              <Fields name="Notice" fields={notice} />
              {"\n"}
            </>
          )}
          {"}\n"}
        </>
      );
    }
  }
};

const findType = (change: __ChangeType, diff: __Schema) =>
  diff.types[change.type.name];

const Header = ({ name }) => "# " + name + "\n";
const Schema = ({ diff }: { diff: __Schema }) => {
  const breaking = diff.changes.filter(
    ({ change }) => change === __ChangeType.BREAKING
  );

  // warnings can't share any types with breaking
  const warning = diff.changes.filter(
    ({ change, type }) =>
      change === __ChangeType.WARNING &&
      !Boolean(breaking.find(x => x.type.name === type.name))
  );

  // notice can't share any types with warnings or breaking
  const notice = diff.changes.filter(
    ({ change, type }) =>
      change === __ChangeType.NOTICE &&
      !Boolean(breaking.find(x => x.type.name === type.name)) &&
      !Boolean(warning.find(x => x.type.name === type.name))
  );

  return (
    <>
      {breaking.length > 0 && (
        <>
          {breaking.map((change, i) => (
            <React.Fragment key={i}>
              <Type type={findType(change, diff)} change={change} key={i} />
              {"\n"}
            </React.Fragment>
          ))}
        </>
      )}
      {warning.length > 0 && (
        <>
          {warning.map((change, i) => (
            <React.Fragment key={i}>
              <Type type={findType(change, diff)} change={change} key={i} />
              {"\n"}
            </React.Fragment>
          ))}
        </>
      )}
      {notice.length > 0 && (
        <>
          {notice.map((change, i) => (
            <React.Fragment key={i}>
              <Type type={findType(change, diff)} change={change} key={i} />
              {"\n"}
            </React.Fragment>
          ))}
        </>
      )}
    </>
  );
};

// shorthand for diff + print
export const printWithChanges = (current, next) => {
  const currentTypeMap = current.getTypeMap();
  const newTypeMap = next.getTypeMap();

  const diff = diffSchemas(currentTypeMap, newTypeMap);
  return renderToStaticMarkup(<Schema diff={diff} />);
};
