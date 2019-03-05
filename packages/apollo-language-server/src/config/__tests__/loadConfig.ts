import { loadConfig } from "../";
import * as path from "path";
import * as fs from "fs";

const makeNestedDir = dir => {
  if (fs.existsSync(dir)) return;

  try {
    fs.mkdirSync(dir);
  } catch (err) {
    if (err.code == "ENOENT") {
      makeNestedDir(path.dirname(dir)); //create parent dir
      makeNestedDir(dir); //create dir
    }
  }
};

const deleteFolderRecursive = path => {
  // don't delete files on azure CI
  if (process.env.AZURE_HTTP_USER_AGENT) return;

  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

const writeFilesToDir = (dir: string, files: Record<string, string>) => {
  Object.keys(files).forEach(key => {
    if (key.includes("/")) makeNestedDir(path.dirname(key));
    fs.writeFileSync(`${dir}/${key}`, files[key]);
  });
};

describe("loadConfig", () => {
  let dir, dirPath;

  // set up a temp dir
  beforeEach(() => {
    dir = fs.mkdtempSync("__tmp__");
    dirPath = `${process.cwd()}/${dir}`;
  });

  // clean up our temp dir
  afterEach(() => {
    if (dir) deleteFolderRecursive(dir);
    dir = dirPath = undefined;
  });

  describe("finding files", () => {
    it("loads with client defaults from different dir", async () => {
      writeFilesToDir(dir, {
        "my.config.js": `
          module.exports = {
            client: {
              service: 'hello'
            }
          }
        `
      });

      const config = await loadConfig({
        configPath: dirPath,
        configFileName: "my.config.js"
      });
      expect(config.rawConfig).toMatchInlineSnapshot(`
Object {
  "client": Object {
    "addTypename": true,
    "clientOnlyDirectives": Array [
      "connection",
      "type",
    ],
    "clientSchemaDirectives": Array [
      "client",
      "rest",
    ],
    "excludes": Array [
      "**/node_modules",
      "**/__tests__",
    ],
    "includes": Array [
      "src/**/*.{ts,tsx,js,jsx,graphql}",
    ],
    "service": "hello",
    "statsWindow": Object {
      "from": -86400,
      "to": -0,
    },
    "tagName": "gql",
  },
  "engine": Object {
    "endpoint": "https://engine-graphql.apollographql.com/api/graphql",
    "frontend": "https://engine.apollographql.com",
  },
}
`);
    });

    it("loads with service defaults from different dir", async () => {
      writeFilesToDir(dir, {
        "my.config.js": `
          module.exports = {
            service: {
              name: 'hello'
            }
          }
        `
      });

      const config = await loadConfig({
        configPath: dirPath,
        configFileName: "my.config.js"
      });
      expect(config.rawConfig).toMatchInlineSnapshot(`
Object {
  "engine": Object {
    "endpoint": "https://engine-graphql.apollographql.com/api/graphql",
    "frontend": "https://engine.apollographql.com",
  },
  "service": Object {
    "endpoint": Object {
      "url": "http://localhost:4000/graphql",
    },
    "excludes": Array [
      "**/node_modules",
      "**/__tests__",
    ],
    "includes": Array [
      "src/**/*.{ts,tsx,js,jsx,graphql}",
    ],
    "name": "hello",
  },
}
`);
    });

    it("[deprecated] loads config from package.json", async () => {
      writeFilesToDir(dir, {
        "package.json": `{"apollo":{"client": {"service": "hello"}} }`
      });
      const config = await loadConfig({ configPath: dirPath });

      expect(config.client.service).toEqual("hello");
    });

    it("loads config from a ts file", async () => {
      writeFilesToDir(dir, {
        "apollo.config.ts": `module.exports = {"client": {"service": "hello"}`
      });
      const config = await loadConfig({ configPath: dirPath });

      expect(config.client.service).toEqual("hello");
    });
  });

  describe("errors", () => {
    it("throws when config file is empty", done => {
      writeFilesToDir(dir, { "my.config.js": `` });

      return loadConfig({
        configPath: dirPath,
        configFileName: "my.config.js"
      }).catch(err => {
        expect(err.message).toMatch(/.*A config file failed to load at.*/);
        done();
      });
    });

    it("throws when explorer.search fails", done => {
      writeFilesToDir(dir, { "my.config.js": `* 98375^%*&^ its lit` });

      return loadConfig({
        configPath: dirPath,
        configFileName: "my.config.js"
      }).catch(err => {
        expect(err.message).toMatch(
          /.*A config file failed to load with options.*/
        );
        done();
      });
    });

    it("issues a deprecation warning when loading config from package.json", async () => {
      jest.spyOn(global.console, "warn");

      writeFilesToDir(dir, {
        "package.json": `{"apollo":{"client": {"service": "hello"}} }`
      });

      await loadConfig({
        configPath: dirPath,
        configFileName: "package.json"
      });

      expect(console.warn.mock.calls[0][0]).toMatchInlineSnapshot(
        `"The \\"apollo\\" package.json configuration key will no longer be supported in Apollo v3. Please use the apollo.config.js file for Apollo project configuration. For more information, see: https://bit.ly/2ByILPj"`
      );
    });

    it("throws if a config file was expected but not found", done => {
      writeFilesToDir(dir, { "my.config.js": `module.exports = {}` });

      return loadConfig({
        configFileName: "my.TYPO.js",
        requireConfig: true // this is what we're testing
      }).catch(err => {
        expect(err.message).toMatch(/.*No Apollo config found for project*/);
        done();
      });
    });

    it("throws if project type cant be resolved", () => {
      writeFilesToDir(dir, {
        "my.config.js": `module.exports = {}`
      });

      const load = async () =>
        await loadConfig({
          configPath: dirPath,
          configFileName: "my.config.js"
        });

      return expect(load()).rejects.toMatchInlineSnapshot(
        `[Error: Unable to resolve project type. Please add either a client or service config. For more information, please refer to https://bit.ly/2ByILPj]`
      );
    });
  });

  describe("env loading", () => {
    it("finds .env in config path & parses for key", async () => {
      writeFilesToDir(dir, {
        "my.config.js": `module.exports = { client: { name: 'hello' } }`,
        ".env": `ENGINE_API_KEY=service:harambe:54378950jn`
      });

      const config = await loadConfig({
        configPath: dirPath,
        configFileName: "my.config.js"
      });

      expect(config.client.service).toEqual("harambe");
    });

    // this doesn't work right now :)
    xit("finds .env in cwd & parses for key", async () => {
      writeFilesToDir(dir, {
        "dir/my.config.js": `module.exports = { client: { name: 'hello' } }`,
        ".env": `ENGINE_API_KEY=service:harambe:54378950jn`
      });
      process.chdir(dir);
      const config = await loadConfig({
        configPath: "dir/",
        configFileName: "my.config.js"
      });

      process.chdir("../");
      expect(config.client.service).toEqual("harambe");
    });
  });

  describe("project type", () => {
    it("uses passed in type as override", async () => {
      writeFilesToDir(dir, {
        "my.config.js": `module.exports = { engine: { endpoint: 'http://a.a' } }`
      });

      const config = await loadConfig({
        configPath: dirPath,
        configFileName: "my.config.js",
        type: "client"
      });

      expect(config.isClient).toEqual(true);
    });
    it("infers client projects", () => {});
    it("infers service projects", () => {});
    it("throws if project type cant be inferred", () => {});
  });

  describe("service name", () => {
    it("lets config service name take precedence for client project", () => {});
    it("lets name passed in take precedence over env var", () => {});
    it("uses env var to determine service name when no other options", () => {});
  });

  describe("default merging", () => {
    it("merges service name and default config for client projects", () => {});
    it("merges service name and default config for service projects", () => {});
    it("merges engine config with projects", () => {});
    it("merges defaults in at the end", () => {});
  });
});
