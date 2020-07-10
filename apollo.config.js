module.exports = {
  client: {
    name: "Apollo CLI",
    service: "engine@prod",
    includes: ["./packages/apollo-language-server/**/*.ts"],
    excludes: ["**/*.test.ts", "**/__tests__/*"]
  },
  engine: {
    endpoint: "https://engine-staging-graphql.apollographql.com/api/graphql"
  }
};
