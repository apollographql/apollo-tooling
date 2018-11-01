import gql from "graphql-tag";

export const SCHEMA_QUERY = gql`
  query GetSchemaByTag($id: ID!, $tag: String!) {
    service(id: $id) {
      schema(tag: $tag) {
        hash
        __schema: introspection {
          queryType {
            name
          }
          mutationType {
            name
          }
          subscriptionType {
            name
          }
          types(filter: { includeAbstractTypes: true }) {
            ...IntrospectionFullType
          }
          directives {
            name
            description
            locations
            args {
              ...IntrospectionInputValue
            }
          }
        }
      }
    }
  }

  fragment IntrospectionFullType on IntrospectionType {
    kind
    name
    description
    fields {
      name
      description
      args {
        ...IntrospectionInputValue
      }
      type {
        ...IntrospectionTypeRef
      }
      isDeprecated
      deprecationReason
    }
    inputFields {
      ...IntrospectionInputValue
    }
    interfaces {
      ...IntrospectionTypeRef
    }
    enumValues(includeDeprecated: true) {
      name
      description
      isDeprecated
      depreactionReason
    }
    possibleTypes {
      ...IntrospectionTypeRef
    }
  }

  fragment IntrospectionInputValue on IntrospectionInputValue {
    name
    description
    type {
      ...IntrospectionTypeRef
    }
    defaultValue
  }

  fragment IntrospectionTypeRef on IntrospectionType {
    kind
    name
    ofType {
      kind
      name
      ofType {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
                ofType {
                  kind
                  name
                }
              }
            }
          }
        }
      }
    }
  }
`;
