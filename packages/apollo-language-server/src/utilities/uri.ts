import URI from "vscode-uri";

export const normalizeURI = (uriString: string) => {
  if (uriString.indexOf("file:///") === 0) {
    return URI.file(URI.parse(uriString).fsPath).fsPath;
  } else if (uriString.match(/^[a-zA-Z]:(\/|\\).*/)) {
    // uri with a drive prefix but not file:///
    const withUnixSeparator = uriString.split("\\").join("/");
    // throw new Error(withUnixSeparator);
    return URI.file(URI.parse("file:///" + withUnixSeparator).fsPath).fsPath;
  }
  const withUnixSeparator = uriString.split("\\").join("/");
  return URI.parse(withUnixSeparator).fsPath;
};
