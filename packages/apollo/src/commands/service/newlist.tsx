import Command, { flags } from "@oclif/command";
import React, { Component, useEffect, useState } from "react";
import { render as renderInk, Color, Box, Text } from "ink";
import { WithRequired, DeepPartial } from "apollo-env";
import {
  GraphQLProject,
  GraphQLServiceProject,
  GraphQLClientProject,
  loadConfig,
  isClientConfig,
  isServiceConfig,
  ApolloConfig,
  getServiceFromKey,
  Debug
} from "apollo-language-server";
import URI from "vscode-uri";
import { parse, resolve } from "path";
import { OclifLoadingHandler } from "../../OclifLoadingHandler";
import ApolloCommand, { useConfig } from "../../NewCommand";

export const LIST_SERVICES = `
  query ListServices($id: ID!, $graphVariant: String! = "current") {
    service(id: $id) {
      implementingServices(graphVariant: $graphVariant) {
        __typename
        ... on FederatedImplementingServices {
          services {
            graphID
            graphVariant
            name
            url
            updatedAt
          }
        }
      }
    }
  }
`;

const Loader = ({ title, isLoading, loaded }) => (
  <Text>
    <Color green={loaded} yellow={isLoading}>
      {isLoading
        ? `Loading ${title}...`
        : loaded
        ? `Loaded ${title}!`
        : `Failed to Load ${title}`}
    </Color>
  </Text>
);

const commandFlags = {
  ...ApolloCommand.flags,
  tag: flags.string({
    char: "t",
    description: "The published tag to list the services from"
  })
};
const commandDescription = "List the services in a graph";
const CommandUI = ({ context }) => {
  const [loadingConfig, config] = useConfig();

  return (
    <>
      <Box>
        <Loader
          title="Project"
          isLoading={loadingConfig}
          loaded={Boolean(config)}
        />
      </Box>
      <Box></Box>
    </>
  );
};

//   title: `Collecting graph info from Apollo Graph Manager`,
export default class ServiceListReact extends ApolloCommand {
  static description = commandDescription;
  static flags = commandFlags;
  render() {
    return <CommandUI context={this.ctx} />;
  }
}
