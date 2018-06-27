import { flags } from "@oclif/command";

export const engineFlags = {
  key: flags.string({
    description: "The API key for the Apollo Engine service",
    default: process.env.ENGINE_API_KEY,
  }),
  engine: flags.string({
    description: "Reporting URL for a custom Apollo Engine deployment",
    hidden: true,
  })
};
