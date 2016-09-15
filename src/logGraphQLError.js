export default function logGraphQLError(error) {
  // Check if we're running from an Xcode script
  if (process.env.XCODE_VERSION_ACTUAL) {
    // Prefixing error output with file name, line and 'error: ',
    // so Xcode will associate with the right file and display the error inline
    const source = error.source;
    const location = error.locations[0];
    console.log(`${source.name}:${location.line}: error: ${error.message}`);
  } else {
    console.log(error.message);
  }
}
