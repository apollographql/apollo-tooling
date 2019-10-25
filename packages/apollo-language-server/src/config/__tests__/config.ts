import {
  ApolloConfig,
  ApolloConfigFormat,
  getGraphInfo,
  loadConfigWithDefaults
} from "../";
import URI from "vscode-uri";
import { DeepPartial } from "apollo-env";

export function createConfig(raw: DeepPartial<ApolloConfigFormat>) {
  return loadConfigWithDefaults(
    {
      config: raw
    },
    getGraphInfo(raw)
  );
}

describe("ApolloConfig", () => {
  describe("configDirURI", () => {
    it("properly parses dir paths for configDirURI", () => {
      const uri = URI.parse("/test/dir/name");
      const config = new ApolloConfig(
        createConfig({ service: { name: "hai" } }),
        uri
      );
      // can be either /test/dir/name or \\test\\dir\\name depending on platform
      // this difference is fine :)
      expect(config.configDirURI.fsPath).toMatch(
        /\/test\/dir\/name|\\test\\dir\\name/
      );
    });
    it("properly parses filepaths for configDirURI", () => {
      const uri = URI.parse("/test/dir/name/apollo.config.js");
      const config = new ApolloConfig(
        createConfig({ service: { name: "hai" } }),
        uri
      );
      // can be either /test/dir/name or \\test\\dir\\name depending on platform
      // this difference is fine :)
      expect(config.configDirURI.fsPath).toMatch(
        /\/test\/dir\/name|\\test\\dir\\name/
      );
    });
  });

  describe("projects", () => {
    it("uses client details when client key is present", () => {
      const rawConfig: ApolloConfigFormat = createConfig({
        client: { service: "my-service" }
      });
      const config = new ApolloConfig(rawConfig);
      const projects = config.projects;
      expect(projects).toHaveLength(2);
      expect(projects[0].isClient).toBeTruthy();
      expect(config.graphId).toEqual("my-service");
    });
    it("uses service details when service key is present", () => {
      const rawConfig: ApolloConfigFormat = createConfig({
        service: { name: "my-service" }
      });
      const config = new ApolloConfig(rawConfig);
      const projects = config.projects;

      expect(projects).toHaveLength(2);
      expect(projects[0].isService).toBeTruthy();
      expect(config.graphId).toEqual("my-service");
    });
    it("creates multiple configs when both client and service are present", () => {
      const rawConfig: ApolloConfigFormat = createConfig({
        client: { service: "my-service" },
        service: { name: "my-service" }
      });
      const config = new ApolloConfig(rawConfig);
      const projects = config.projects;

      expect(projects).toHaveLength(2);
      expect(projects.find(c => c.isClient)).toBeTruthy();
      expect(projects.find(c => c.isService)).toBeTruthy();
    });
    it("creates multiple configs when nothing is present", () => {
      const config = new ApolloConfig(createConfig({}));
      expect(config.projects).toHaveLength(2);
    });
  });

  describe("tag", () => {
    it("gets default tag when none is set", () => {
      const config = new ApolloConfig(
        createConfig({ client: { service: "hai" } })
      );
      expect(config.serviceGraphVariant).toEqual("current");
    });

    it("gets tag from service specifier", () => {
      const config = new ApolloConfig(
        createConfig({ client: { service: "hai@master" } })
      );
      expect(config.clientGraphVariant).toEqual("master");
    });

    it("can set and override tags", () => {
      const config = new ApolloConfig(
        createConfig({ client: { service: "hai@master" } })
      );
      config.serviceGraphVariant = "new";
      expect(config.serviceGraphVariant).toEqual("new");
    });
  });

  describe("setDefaults", () => {
    it("can override engine defaults", () => {
      const config = new ApolloConfig({});
      const overrides = {
        engine: {
          endpoint: "https://test.apollographql.com/api/graphql",
          frontend: "https://test.apollographql.com"
        }
      };
      config.setDefaults(overrides);
      expect(config.engine).toEqual(overrides.engine);
    });

    it("can override client defaults", () => {
      const config = new ApolloConfig({});
      const overrides = {
        client: {
          name: "my-client",
          service: "my-service@master"
        }
      };
      config.setDefaults(overrides);
      expect(config.client).toEqual(overrides.client);
    });

    it("can override service defaults", () => {
      const config = new ApolloConfig({});
      const overrides = {
        service: {
          name: "my-service",
          url: "localhost:9090"
        }
      };
      config.setDefaults(overrides);
      expect(config.service).toEqual(config.service);
    });
  });
});
