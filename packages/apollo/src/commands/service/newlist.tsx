import React, { Fragment } from "react";
import { gql, useQuery } from "@apollo/client";
import { Color, Box } from "ink";
import Spinner from "ink-spinner";
import Table from "ink-table";
import moment from "moment";
import { isNotNullOrUndefined } from "apollo-env";

import ApolloCommand, { useConfig, useOclif } from "../../NewCommand";

export const LIST_SERVICES = gql`
  query ListServicesReact($id: ID!, $graphVariant: String! = "current") {
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

/**
 * TODO
 *
 */

// title: `Collecting graph info from Apollo Graph Manager`,
export default class ServiceListReact extends ApolloCommand {
  static description =
    "List the services that implement a managed federated graph";
  // TODO: add command-specific flags
  // static flags =

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
    const serviceList = formatServicesForTable({ implementingServices });

    return (
      <Box flexDirection="column" marginTop={1}>
        {serviceList.length ? <Table data={serviceList} /> : null}
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
      "This graph is not federated. There are no services composing the graph";
  } else if (implementingServices.services.length === 0) {
    errorMessage = "There are no services on this federated graph";
  }

  const targetUrl = `${frontendUrl}/graph/${graphName}/service-list`;

  return (
    // only put a margin on top of the message if there's no errors
    <Box marginTop={errorMessage.length ? 0 : 1} flexDirection={"column"}>
      {errorMessage && <Color red>{errorMessage}</Color>}
      <Box>
        View full details at: <Color cyan>{targetUrl}</Color>
      </Box>
    </Box>
  );
};

function formatServicesForTable({ implementingServices }) {
  const effectiveDate =
    process.env.NODE_ENV === "test" ? new Date("2019-06-13") : new Date();
  return implementingServices.services
    .map(({ name, updatedAt, url }) => ({
      Name: name,
      URL: url || "",
      ["Last Updated"]: `${moment(updatedAt).format("D MMMM YYYY")} (${moment(
        updatedAt
      ).from(effectiveDate)})`
    }))
    .sort((s1, s2) => (s1.Name.toUpperCase() > s2.Name.toUpperCase() ? 1 : -1))
    .filter(isNotNullOrUndefined);
}
