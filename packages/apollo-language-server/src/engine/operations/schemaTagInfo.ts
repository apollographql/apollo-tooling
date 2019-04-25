import gql from "graphql-tag";

export const SCHEMA_TAG_INFO_QUERY = gql`
  query SchemaTagInfo($service: ID!, $tag: String = "current") {
    service(id: $service) {
      schema(tag: $tag) {
        hash
        gitContext {
          committer
          commit
        }
        fieldCount
        typeCount
        createdAt
      }
    }
  }
`;
