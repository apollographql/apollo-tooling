module.exports = {
  client: {
    name: "Apollo CLI",
    service: "engine@master",
    includes: ["./packages/apollo-language-server/**/*.ts"],
    excludes: ["**/*.test.ts", "**/__tests__/*"]
  },
  // service: {
  //   name: "engine@master",
  //   endpoint: {
  //     url: "https://engine-staging-graphql.apollographql.com/api/graphql"
  //   },
  //   skipSSLValidation: true
  // },
  engine: {
    frontend: "https://engine-staging.apollographql.com",
    endpoint: "https://engine-staging-graphql.apollographql.com/api/graphql"
  }
};
