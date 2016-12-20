// Based on https://facebook.github.io/relay/docs/guides-babel-plugin.html#using-other-graphql-implementations

import fetch from 'node-fetch';
import * as fs from 'fs';
import * as path from 'path';

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

export default async function downloadSchema(url: string, outputPath: string, additionalHeaders: {[key: string]: string}) {
  const headers = Object.assign(defaultHeaders, additionalHeaders);

  let result;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ 'query': introspectionQuery }),
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
