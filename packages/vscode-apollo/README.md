# Apollo VSCode

An all-in-one tooling experience for developing apps with Apollo

- Get instant feedback and intelligent autocomplete as you write queries
- Seamlessly managed your client side schema alongside your remote one
- View performance statistics next to your query definitions

## Features

- Loads your GraphQL schemas and queries automatically from an [Apollo Config](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/README.md#configuration) file
- Adds syntax highlighting for GraphQL files and `gql` templates inside JavaScript files
- Code-completes fields, arguments, types, and variables in your queries
- Detects and loads client side schemas and validates client side field usage in operations
- Displays performance statistics from [Apollo Engine](https://www.apollographql.com/engine) inline with your queries
- Jump-to-definition for fragments and schema types
- Detects fragment references and shows them next to definitions

## How to get it?

Open up VS Code and search for the extension "Apollo".

## How to get it set up?

The extension searches for [Apollo Config](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/README.md#configuration) definitions in `package.json` or `apollo.config.js` files. Apollo Config can be set up to pull a schema from an introspection or from a [published version on Apollo Engine](https://www.apollographql.com/docs/engine/features/schema-history.html).

```js
// package.json

{
  ...,
  "apollo": {
    "client": {
      "service": "my-service-name"
    }
  }
}
```

## Troubleshooting

### Extension not starting correctly? Check the logs!

If you're having trouble with the extension not launching or not detecting your configuration files, you can check the language server logs.

1.  Open the VS Code output tab by running the command "View: Toggle Output"
2.  Switch the output view to "Apollo GraphQL"
3.  Check the logs and report any bugs you find!
