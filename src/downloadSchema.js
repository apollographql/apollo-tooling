// Based on https://facebook.github.io/relay/docs/guides-babel-plugin.html#using-other-graphql-implementations

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

import {
  buildClientSchema,
  introspectionQuery,
  printSchema,
} from 'graphql/utilities';

import { ApolloError } from './errors'

export default async function downloadSchema(url, outputPath) {
  let result;
  try {
    const response = await fetch(`${url}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 'query': introspectionQuery }),
    });

    result = await response.json();
  } catch (error) {
    throw new ApolloError(`Error while fetching introspection query result: ${error.message}`);
  }

  if (result.errors) {
    throw new ApolloError(`Errors in introspection query result: ${result.errors}`);
  }

  const schemaData = result.data;
  if (!schemaData) {
    throw new ApolloError(`No introspection query result data found, server responded with: ${JSON.stringify(result)}`);
  }

  fs.writeFileSync(outputPath, JSON.stringify(schemaData, null, 2));
}
