---
title: Editor plugins
description: How to get the most out of your editor with Apollo
---

By design, GraphQL has the ability to create incredible developer experiences thank's to its strongly typed schema and query language. The Apollo GraphQL Platform brings these possibilities to life with deep editor integrations in Apollo GraphQL for VS Code. This extension brings an all-in-one tooling experience for developing apps with Apollo, including features like:

- Instant feedback and [intelligent autocomplete](#autocomplete) for fields, arguments, types, and variables as you write queries
- Seamlessly manage your client side schema alongside your remote one
- [See performance information](#performance-insights) inline with your query definitions
- Loads GraphQL schemas and queries automatically from an Apollo Config file
- Adds [syntax highlighting](#syntax) for GraphQL files and gql templates inside JavaScript files
- Detects and loads client-side schemas and validates client side field usage in operations
- [Jump-to-definition](#jump-to-def) for fragments and schema types
- Supports [local](#local-schemas) and [client-only](#client-only-schemas) schemas
- Allows [switching schema tags](#commands) to work on upcoming features
- And more...

<img src="./images/marketplace/jump-to-def.gif" width="80%" style="margin: 5%" alt="Using jump to definition on a fragment">

<h2 id="getting-started">Getting Started</h2>

To get started, first **install the Apollo GraphQL extension**. After installation, GraphQL syntax highlighting should automatically be enabled for `.graphql`, `.gql`, `.js` and `.ts` file types.

<h3 id="linking-a-schema">Linking a schema</h2>

To get all of the benefits of the VS Code experience, its best to link the schema that is being developed against. The best way to do that is by [publishing a schema](./schema-registry.html#publish) to the Apollo schema registry. Once that is done, two steps are needed:

1. Create an `apollo.config.js` at the root of the project
2. Copy an API key from the Engine dashboard of the published service

<h3 id="apollo-config">Setting up an Apollo config</h3>
In order for the VS Code plugin to know how to find the schema, it needs to be linked to either a published schema or a local one. To link a project to a published schema, edit the `apollo.config.js` file to look like this:

```js
module.exports = {
  client: {
    service: "my-graphql-app"
  }
};
```

The service name is the id of the service created in Engine and can be found in the services dashboard of [Engine](https://engine.apollographql.com)

> Important note: If the name of the service in Engine is changed, this value should be the service id. This can be found in the url when browsing the service in Engine. This will be easier to manage in the near future

<h3 id="api-key">Setting up an API key</h3>
To authenticate with Engine to pull down the schema, create a file next to the `apollo.config.js` called `.env`. This should be an untraced file (i.e. don't push it to GitHub). Go to the settings page of the published service and create a new API key.

> It is best practice to create a new API key for each member of the team and name the key so its easy to find and revoke if needed

After the key is found, add the following line to the `.env` file:

```bash
ENGINE_API_KEY=<enter copied key here>
```

After this is done, VS Code can be restarted and the editor integration will start providing autocomplete, validation, and more!

<h3 id="local-schemas">Local schemas</h3>

Sometimes it may make sense to link the editor to a locally running version of a schema to try out new designs that are in active development. To do this, the `apollo.config.js` file can be linked to a local service definition:

```js
module.exports = {
  client: {
    service: {
      name: "my-graphql-app",
      url: "http://localhost:4000/graphql"
    }
  }
};
```

> Linking to the local schema won't provide all features such as switching schema tags and performance metrics.

More information about configuring an Apollo project can be found [here](../platform/apollo-config.html)

<h3 id="client-only-schemas">Client-only schemas</h3>

One of the best features of the VS Code extension is the automatic merging of remote schemas and local ones when using integrated state management with Apollo Client. This happens automatically whenever schema definitions are found within a client project.

Client side schema definitions can be spread throughout the client app project and will be merged together to create one single schema. This can be controlled through the `apollo.config.js` at the root of he project:

```js
module.exports = {
  client: {
    service: "my-graphql-app"
    includes: ["./src/**/*.js"],
    excludes: ["**/__tests__/**"]
  }
}
```

By default, the VS Code extension will look for all files under "./src" to find both the operations and schema definitions for building a complete schema for the application.

<h2 id="features">Features</h2>

Apollo for VS Code brings many helpful features for working on a GraphQL project.

<h3 id="syntax">Syntax highlighting</h3>

Apollo's editor extension provides syntax highlighting for all things GraphQL, including schema definitions in `.graphql` files, complex queries in TypeScript, and even client-only schema extensions. Syntax highlighting for GraphQL works out-of-the-box for `.graphql`, `.gql`, `.js` and `.ts` file types!

<h3 id="autocomplete">Intelligent autocomplete</h3>

Once configured, editors have full knowledge of the schema clients are running operations against, including client-only schemas (for things like local state mutations). Because of this, editors have the ability to autocomplete fields and arguments as you type.

<img src="./images/marketplace/autocomplete.gif" width="80%" style="margin: 5%" alt="vscode completing a field when typing">

<h3 id="errors-and-warnings">Inline errors and warnings</h3>

Editors can use local or published schemas to validate operations before running them. **Syntax errors**, **invalid fields or arguments**, and even **deprecated fields** instantly appear as errors or warnings right in your editor, ensuring all developers are working with the most up-to-date production schemas.

<img src="./images/marketplace/warnings-and-errors.gif" width="80%" style="margin: 5%" alt="tooltip showing a field deprecation warning and error">

<h3 id="field-type-info">Inline field type information</h3>

Because of GraphQL's strongly-typed schema, editors not only know about which fields and arguments are valid, but also what types are expected. Hover over any type in a valid GraphQL operation to see what type that field returns and whether or not it can be null.

<img src="./images/marketplace/type-info.png" width="80%" style="margin: 5%" alt="a tooltip showing a Boolean type for a field">

<h3 id="performance-insights">Performance insights</h3>

GraphQL operations provide incredible flexibilty in what data is requested from a service. This can sometimes lead to unknown performance characteristics of how an operation will run. Thanks to the trace wharehouse in the Apollo GraphQL Platform, teams no longer will be surprised by how long an operation takes.

The VS Code extension will show inline performance diagnostics when connected to a service with reported metrics in Engine. As operations are typed, any fields that take longer than 1ms to respond will be annoated to the right of the field inline! This gives team members a picture of how long the operation will take as more and more fields are added to operations or fragments.

<img src="./images/marketplace/perf-annotation.png" width="80%" style="margin: 5%" alt="Performance annotation next to a field">

<h3 id="jump-to-def">Jump to definition</h3>

Navigating large codebases can be difficult. In GraphQL projects, fragments of an operation may be shared throughout the project. Rather than navigating imports to find fragment definitions, the Apollo extension lets developers jump straight to it. Just command + click (mac) on a fragment to go to its definition.

<img src="./images/marketplace/jump-to-def.gif" width="80%" style="margin: 5%" alt="Using jump to definition on a fragment">

<h3 id="commands">Apollo commands</h3>
The VS Code extension integrates with the VS Code command palate and provides two commands currently:

- switch schema tags
- reload the schema and diagnostics

These can be run by typing `cmd+shift+p` then typing `apollo` into thr prompt. That will show the two commands which can help teams stay on top of changes to the schema right in their editors

<h2 id="troubleshooting">Troubleshooting</h2>

The most common errors are configuration errors, like a missing `.env` file or incorrect service information in the `apollo.config.js` file.
There is more information about configuring an Apollo projects [here](../platform/apollo-config.html).

Sometimes errors will show up as a notification at the bottom of your editor. Other, less critical, messages may be shown in the output pane of the editor. To open the output pane and get diagnostic information about the extension and the current service loaded (if working with a client project), just click the "Apollo GraphQL" icon in the status bar at the bottom.

<img src="./images/marketplace/stats.gif" width="80%" style="margin: 5%" alt="Clicking the status bar icon to open the output pane">

If problems persist or the error messages are unhelpful, an [issue](https://github.com/apollographql/apollo-tooling/issues) can be opened on the `apollo-tooling` repository.
