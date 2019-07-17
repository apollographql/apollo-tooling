import gql from "graphql-tag";

export const DELETE_SCHEMA_TAG = gql`
  mutation DeleteSchemaTag($id: ID!, $tag: String!) {
    service(id: $id) {
      deleteSchemaTag(tag: $tag) {
        deleted
      }
    }
  }
`;
