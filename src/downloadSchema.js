// Based on https://facebook.github.io/relay/docs/guides-babel-plugin.html#using-other-graphql-implementations

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

import {
  buildClientSchema,
  introspectionQuery,
  printSchema,
} from 'graphql/utilities';

export default async function downloadSchema(url, outputPath) {
  const response = await fetch(`${url}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 'query': introspectionQuery }),
  });

  const result = await response.json();

  if (result.errors) {
    throw new Error(`Errors in introspection query result: ${result.errors}`);
  }

  const schemaData = result.data;
  if (!schemaData) {
    throw new Error('No instrospection query result data');
  }

  fs.writeFileSync(outputPath, JSON.stringify(schemaData, null, 2));
}
