import React, { Fragment } from "react";
import { gql, useQuery } from "@apollo/client";
import { Color, Box } from "ink";
import Spinner from "ink-spinner";
import Table from "ink-table";
import moment from "moment";
import sortBy from "lodash.sortby";
import { isNotNullOrUndefined } from "apollo-env";

import ApolloCommand, { useConfig, useOclif } from "../../NewCommand";

export const LIST_SERVICES = gql`
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

//   title: `Collecting graph info from Apollo Graph Manager`,
export default class ServiceListReact extends ApolloCommand {
  static description =
    "List the services that implement a managed federated graph";
  // static description = commandDescription;
  // static flags = commandFlags;
  render() {
    const config = useConfig();
    const { flags } = useOclif();

    const id = config.name;
    const graphVariant = flags.tag || config.tag;

    const { loading, data, error } = useQuery(LIST_SERVICES, {
      variables: { id, graphVariant }
    });

    if (error) throw error;

    if (loading)
      return (
        <Box>
          <Loader />
          <Box>
            Fetching list of services for graph{" "}
            <Color cyan>{id + "@" + graphVariant}</Color>
          </Box>
        </Box>
      );

    const implementingServices = data.service.implementingServices;
    const frontendUrl = config.engine.frontend;
    const serviceList = formatHumanReadable({ implementingServices });

    return (
      <Box flexDirection="column" marginTop={1}>
        <Table data={serviceList} />
        <Footer
          implementingServices={implementingServices}
          graphName={id}
          frontendUrl={frontendUrl}
        />
      </Box>
    );
  }
}

const Loader = () => (
  <Box paddingRight={1}>
    <Color green>
      <Spinner type="dots" />
    </Color>
  </Box>
);

const Footer = ({ implementingServices, graphName, frontendUrl }) => {
  let errorMessage = "";

  if (
    !implementingServices ||
    implementingServices.__typename === "NonFederatedImplementingService"
  ) {
    errorMessage =
      "This graph is not federated, there are no services composing the graph";
  } else if (implementingServices.services.length === 0) {
    errorMessage = "There are no services on this federated graph";
  }

  const targetUrl = `${frontendUrl}/graph/${graphName}/service-list`;

  return (
    <Box marginTop={1}>
      {errorMessage && <Color red>{errorMessage}</Color>}
      View full details at: <Color cyan>{targetUrl}</Color>
    </Box>
  );
};

function formatHumanReadable({ implementingServices }) {
  const effectiveDate =
    process.env.NODE_ENV === "test" ? new Date("2019-06-13") : new Date();
  return sortBy(implementingServices.services, [
    service => service.name.toUpperCase()
  ])
    .map(({ name, updatedAt, url }) => ({
      Name: name,
      URL: url || "",
      ["Last Updated"]: `${moment(updatedAt).format("D MMMM YYYY")} (${moment(
        updatedAt
      ).from(effectiveDate)})`
    }))
    .filter(isNotNullOrUndefined);
}
