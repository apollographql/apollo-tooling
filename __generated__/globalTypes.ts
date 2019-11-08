/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

//==============================================================
// START Enums and Input Objects
//==============================================================

export enum ChangeSeverity {
  FAILURE = "FAILURE",
  NOTICE = "NOTICE",
  WARNING = "WARNING"
}

/**
 * __DirectiveLocation introspection type
 */
export enum IntrospectionDirectiveLocation {
  ARGUMENT_DEFINITION = "ARGUMENT_DEFINITION",
  ENUM = "ENUM",
  ENUM_VALUE = "ENUM_VALUE",
  FIELD = "FIELD",
  FIELD_DEFINITION = "FIELD_DEFINITION",
  FRAGMENT_DEFINITION = "FRAGMENT_DEFINITION",
  FRAGMENT_SPREAD = "FRAGMENT_SPREAD",
  INLINE_FRAGMENT = "INLINE_FRAGMENT",
  INPUT_FIELD_DEFINITION = "INPUT_FIELD_DEFINITION",
  INPUT_OBJECT = "INPUT_OBJECT",
  INTERFACE = "INTERFACE",
  MUTATION = "MUTATION",
  OBJECT = "OBJECT",
  QUERY = "QUERY",
  SCALAR = "SCALAR",
  SCHEMA = "SCHEMA",
  SUBSCRIPTION = "SUBSCRIPTION",
  UNION = "UNION"
}

export enum IntrospectionTypeKind {
  ENUM = "ENUM",
  INPUT_OBJECT = "INPUT_OBJECT",
  INTERFACE = "INTERFACE",
  LIST = "LIST",
  NON_NULL = "NON_NULL",
  OBJECT = "OBJECT",
  SCALAR = "SCALAR",
  UNION = "UNION"
}

export enum ValidationErrorCode {
  DEPRECATED_FIELD = "DEPRECATED_FIELD",
  INVALID_OPERATION = "INVALID_OPERATION",
  NON_PARSEABLE_DOCUMENT = "NON_PARSEABLE_DOCUMENT"
}

export enum ValidationErrorType {
  FAILURE = "FAILURE",
  INVALID = "INVALID",
  WARNING = "WARNING"
}

/**
 * This is stored with a schema when it is uploaded
 */
export interface GitContextInput {
  remoteUrl?: string | null;
  commit: string;
  committer?: string | null;
  message?: string | null;
  branch?: string | null;
}

export interface HistoricQueryParameters {
  from?: any | null;
  to?: any | null;
  queryCountThreshold?: number | null;
  queryCountThresholdPercentage?: number | null;
}

export interface IntrospectionDirectiveInput {
  name: string;
  description?: string | null;
  locations: IntrospectionDirectiveLocation[];
  args: IntrospectionInputValueInput[];
}

/**
 * __EnumValue introspection type
 */
export interface IntrospectionEnumValueInput {
  name: string;
  description?: string | null;
  isDeprecated: boolean;
  deprecationReason?: string | null;
}

/**
 * __Field introspection type
 */
export interface IntrospectionFieldInput {
  name: string;
  description?: string | null;
  args: IntrospectionInputValueInput[];
  type: IntrospectionTypeInput;
  isDeprecated: boolean;
  deprecationReason?: string | null;
}

/**
 * __Value introspection type
 */
export interface IntrospectionInputValueInput {
  name: string;
  description?: string | null;
  type: IntrospectionTypeInput;
  defaultValue?: string | null;
}

/**
 * __Schema introspection type
 */
export interface IntrospectionSchemaInput {
  types?: IntrospectionTypeInput[] | null;
  queryType: IntrospectionTypeRefInput;
  mutationType?: IntrospectionTypeRefInput | null;
  subscriptionType?: IntrospectionTypeRefInput | null;
  directives: IntrospectionDirectiveInput[];
}

/**
 * __Type introspection type
 */
export interface IntrospectionTypeInput {
  kind: IntrospectionTypeKind;
  name?: string | null;
  description?: string | null;
  fields?: IntrospectionFieldInput[] | null;
  interfaces?: IntrospectionTypeInput[] | null;
  possibleTypes?: IntrospectionTypeInput[] | null;
  enumValues?: IntrospectionEnumValueInput[] | null;
  inputFields?: IntrospectionInputValueInput[] | null;
  ofType?: IntrospectionTypeInput | null;
}

/**
 * Shallow __Type introspection type
 */
export interface IntrospectionTypeRefInput {
  name: string;
  kind?: string | null;
}

export interface OperationDocumentInput {
  body: string;
  name?: string | null;
}

/**
 * Input for registering a partial schema to an implementing service.
 * One of the fields must be specified (validated server-side).
 *
 * If a new partialSchemaSDL is passed in, this operation will store it before
 * creating the association.
 *
 * If both the sdl and hash are specified, an error will be thrown if the provided
 * hash doesn't match our hash of the sdl contents
 */
export interface PartialSchemaInput {
  sdl?: string | null;
  hash?: string | null;
}

export interface RegisteredClientIdentityInput {
  identifier: string;
  name: string;
  version?: string | null;
}

export interface RegisteredOperationInput {
  signature: string;
  document?: string | null;
  metadata?: RegisteredOperationMetadataInput | null;
}

export interface RegisteredOperationMetadataInput {
  engineSignature?: string | null;
}

//==============================================================
// END Enums and Input Objects
//==============================================================
