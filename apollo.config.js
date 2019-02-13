module.exports = {
  client: {
    name: "Apollo CLI",
    service: "engine@master",
    includes: ["./packages/apollo-language-server/**/*.ts"]
  },
  engine: {
    frontend: "https://engine-staging.apollographql.com",
    endpoint: "https://engine-staging-graphql.apollographql.com/api/graphql"
  }
};
