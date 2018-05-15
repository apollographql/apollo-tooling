import gql from "graphql-tag";

export const SCHEMA_QUERY = gql`
  query GetSchemaByTag($id: ID!, $tag: String!) {
    service(id: $id) {
      schema(tag: $tag) {
        hash
        __schema: schema {
          queryType {
            name
          }
          mutationType {
            name
          }
          subscriptionType {
            name
          }
          types {
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

  fragment IntrospectionFullType on __Type {
    kind
    name
    description
    fields(includeDeprecated: true) {
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
      deprecationReason
    }
    possibleTypes {
      ...IntrospectionTypeRef
    }
  }

  fragment IntrospectionInputValue on __InputValue {
    name
    description
    type {
      ...IntrospectionTypeRef
    }
    defaultValue
  }

  fragment IntrospectionTypeRef on __Type {
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
