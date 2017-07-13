// Based on https://facebook.github.io/relay/docs/guides-babel-plugin.html#using-other-graphql-implementations

import * as fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';

import {
  buildClientSchema,
  introspectionQuery,
  printSchema,
} from 'graphql/utilities';

import { ToolError } from './errors'

const defaultHeaders = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

export default async function downloadSchema(url, outputPath, additionalHeaders, insecure, method) {
  const headers = Object.assign(defaultHeaders, additionalHeaders);
  const agent = insecure ? new https.Agent({ rejectUnauthorized: false }) : null;

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
