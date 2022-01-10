import { gql } from "@apollo/client";

export const GET_DEITY = gql`
  query GetDeities($lifespan: Lifespan) {
    deities(lifespan: $lifespan) {
      ... on God {
        name
        lifespan
      }
      ... on Deity_Titan {
        name
      }
    }
  }
`;
