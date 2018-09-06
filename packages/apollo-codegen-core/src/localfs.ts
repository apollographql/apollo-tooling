import * as fs from "fs";
export { fs };

export function withGlobalFS<T>(thunk: () => T): T {
  return thunk();
}
