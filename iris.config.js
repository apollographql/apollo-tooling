module.exports = {
  client: {
    service: {
      name:"xyz",
      service: 'test-my-apollo-service',
      url: 'https://api.github.com/graphql',
      localSchemaFile: './iris/schema.gql',
    },
    target:"typescript",
    addTypename: true,
    includes:["iris/queries/\*.ts"],
  }
};
