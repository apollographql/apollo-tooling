// import { buildSchema } from "graphql";
// const gql = String.raw;

// import { printWithChanges } from "../print";

// const schemas = (sd1, sd2) => ({
//   current: buildSchema(sd1),
//   next: buildSchema(sd2),
// });

it("shows breaking changes on a type", () => {
  //   const { current, next } = schemas(
  //     gql`
  //       type User {
  //         id: ID!
  //       }
  //       type Person {
  //         id: ID!
  //       }
  //     `,
  //     gql`
  //       type User {
  //         id: ID!
  //       }
  //       type Group {
  //         id: ID!
  //         member: User
  //         members(type: String!): User
  //       }
  //     `
  //   );
  //   const sdl = printWithChanges(current, next);
  //   console.log(sdl);
});
