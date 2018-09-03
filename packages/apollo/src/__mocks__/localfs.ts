import { Volume, createFsFromVolume } from "memfs";
import { patchFs } from "fs-monkey";

export const vol = Volume.fromJSON({});
export const fs = createFsFromVolume(vol);

export function withGlobalFS<T>(thunk: () => T): T {
  const unpatch = patchFs(vol);
  const ret = thunk();
  unpatch();
  return ret;
}
