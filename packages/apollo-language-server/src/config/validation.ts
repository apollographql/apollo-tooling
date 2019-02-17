import { ApolloConfigFormat } from "./config";
import {
  Diagnostic,
  TextDocument,
  Range,
  DiagnosticSeverity
} from "vscode-languageserver";
import {
  parseServiceSpecifier,
  isLocalServiceConfig,
  isClientConfig,
  isRemoteServiceConfig
} from "./utils";

interface ValidationInput {
  config: ApolloConfigFormat;
  document: TextDocument;
  text: string;
}

type ValidationFunction = (input: ValidationInput) => Diagnostic[];

const validationRules: ValidationFunction[] = [
  topLevelKeys,
  clientService,
  clientIncludes
];

export function collectConfigDiagnostics(
  config: ApolloConfigFormat,
  document: TextDocument
) {
  const text = document.getText();

  const diagnostics = validationRules.map(rule =>
    rule({ config, document, text })
  );

  return diagnostics.flat();
}

function topLevelKeys({ config, document }: ValidationInput) {
  const { client, service, ...invalidKeys } = config;
  return Object.keys(invalidKeys).map(invalidKey =>
    Diagnostic.create(
      getRange(invalidKey, document),
      `'${invalidKey}' is not a valid top-level key.`,
      DiagnosticSeverity.Warning
    )
  );
}

function clientService({ config, document, text }: ValidationInput) {
  const { client } = config;
  if (!client) return [];

  // Client needs a service, else nothing to validate.
  if (!client.service) {
    return [
      Diagnostic.create(
        getRange("client", document),
        `A service key is required for a client.`,
        DiagnosticSeverity.Error
      )
    ];
  }

  const diagnostics: Diagnostic[] = [];
  // Client service string should specify a tag
  if (typeof client.service === "string") {
    const [, tag] = parseServiceSpecifier(client.service);
    if (!tag) {
      diagnostics.push(
        Diagnostic.create(
          getRange("service", document),
          `Specifying a tag is recommended (service: service-name@tag)`,
          DiagnosticSeverity.Warning
        )
      );
    }
  } else if (typeof client.service === "object") {
    // Should specify a client.service.name
    if (!client.service.name) {
      diagnostics.push(
        Diagnostic.create(
          getRange("service", document),
          `A 'name' should be specified on the service object.`,
          DiagnosticSeverity.Warning
        )
      );
    }

    // A schema source must be provided (local or remote)
    if (
      !isLocalServiceConfig(client.service) &&
      !isRemoteServiceConfig(client.service)
    ) {
      diagnostics.push(
        Diagnostic.create(
          getRange("service", document),
          `A schema source must be provided via a 'localSchemaFile' or 'url'.`,
          DiagnosticSeverity.Error
        )
      );
    }
  } else {
    // 'service' is invalid
    diagnostics.push(
      Diagnostic.create(
        getRange("service", document),
        `'service' must be either a string or an object`,
        DiagnosticSeverity.Error
      )
    );
  }

  return diagnostics;
}

// Give the user a nudge if they aren't specifying `includes`
function clientIncludes({ config, document }: ValidationInput) {
  return config.client && !config.client.includes
    ? [
        Diagnostic.create(
          getRange("client", document),
          `'client.includes' should specify an array of globs for locating graphql documents within the project`,
          DiagnosticSeverity.Warning
        )
      ]
    : [];
}

function getRange(key: string, document: TextDocument) {
  const text = document.getText();
  const index = text.indexOf(key);
  return Range.create(
    document.positionAt(index),
    document.positionAt(index + key.length)
  );
}
