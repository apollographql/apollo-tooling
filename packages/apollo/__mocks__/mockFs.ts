import { Volume, createFsFromVolume } from "memfs";
// import { patchFs } from "fs-monkey";
const vol = Volume.fromJSON({});
module.exports = createFsFromVolume(vol);
module.exports.vol = vol;
