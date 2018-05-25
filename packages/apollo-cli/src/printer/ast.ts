export enum __DirectiveLocation {
  QUERY,
  MUTATION,
  SUBSCRIPTION,
  FIELD,
  FRAGMENT_DEFINITION,
  FRAGMENT_SPREAD,
  INLINE_FRAGMENT,
  SCHEMA,
  SCALAR,
  OBJECT,
  FIELD_DEFINITION,
  ARGUMENT_DEFINITION,
  INTERFACE,
  UNION,
  ENUM,
  ENUM_VALUE,
  INPUT_OBJECT,
  INPUT_FIELD_DEFINITION,
}

export interface __Directive {
  name: String;
  locations: __DirectiveLocation[];
  args: __InputValue[];
  changes: __Change[];
}

export interface __InputValue {
  name: String;
  type: __Type;
  defaultValue: String;
  changes: __Change[];
}

export interface __EnumValue {
  name: String;
  isDeprecated: Boolean;
  changes: __Change[];
}

export interface __Field {
  name: String;
  args: __InputValue[];
  type: __Type;
  isDeprecated: Boolean;
  changes: __Change[];
}

export enum __TypeKind {
  SCALAR = "ScalarTypeDefinition",
  OBJECT = "ObjectTypeDefinition",
  INTERFACE = "InterfaceTypeDefinition",
  UNION = "UnionTypeDefinition",
  ENUM = "EnumTypeDefinition",
  INPUT_OBJECT = "InputObjectTypeDefinition",
  LIST = "ListTypeDefinition",
  NON_NULL = "NonNullTypeDefinition",
}

export enum __ChangeType {
  BREAKING,
  WARNING,
  NOTICE,
}

export interface __Change {
  change: __ChangeType;
  code: String;
  message: String;
  type?: __TypeKind;
}

export interface __Type {
  kind: __TypeKind;
  name: String;
  fields: __Field[];
  interfaces?: __Type[];
  enumValues?: __EnumValue[];
  inputFields?: __InputValue[];
  changes: __Change[];
}

export interface __Schema {
  query: __Type;
  mutation?: __Type;
  subscription?: __Type;
  types: __Type[];
  directives: __Directive[];
  changes: __Change[];
}
