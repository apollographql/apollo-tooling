// Based on https://facebook.github.io/relay/docs/guides-babel-plugin.html#using-other-graphql-implementations

import fetch from 'node-fetch';
import * as fs from 'fs';
import * as https from 'https';

import {
  introspectionQuery,
} from 'graphql/utilities';

import { ToolError } from 'apollo-codegen-core/lib/errors'

const defaultHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

export default async function downloadSchema(url: string, outputPath: string, additionalHeaders: { [name: string]: string }, insecure: boolean, method: string) {
  const headers: { [index: string]: string } = Object.assign(defaultHeaders, additionalHeaders);
  const agent = insecure ? new https.Agent({ rejectUnauthorized: false }) : undefined;

  let result;
  try {
    const response = await fetch(url, {
      method: method,
      headers: headers,
      body: JSON.stringify({ 'query': introspectionQuery }),
      agent,
    });

    result = await response.json();
  } catch (error) {
    throw new ToolError(`Error while fetching introspection query result: ${error.message}`);
  }

  if (result.errors) {
    throw new ToolError(`Errors in introspection query result: ${result.errors}`);
  }

  const schemaData = result;
  if (!schemaData.data) {
    throw new ToolError(`No introspection query result data found, server responded with: ${JSON.stringify(result)}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(schemaData, null, 2));
}
