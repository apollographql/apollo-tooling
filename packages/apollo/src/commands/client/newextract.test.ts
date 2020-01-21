import ClientExtract from "./newextract";
import { executeCommand } from "../../utils/command-test-utils";

jest.mock("fs");

const mockOperationDocument = JSON.parse(
  `{"ListServicesReact":{"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ListServicesReact","loc":{"start":9,"end":26}},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id","loc":{"start":28,"end":30}},"loc":{"start":27,"end":30}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID","loc":{"start":32,"end":34}},"loc":{"start":32,"end":34}},"loc":{"start":32,"end":35}},"directives":[],"loc":{"start":27,"end":35}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"graphVariant","loc":{"start":38,"end":50}},"loc":{"start":37,"end":50}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String","loc":{"start":52,"end":58}},"loc":{"start":52,"end":58}},"loc":{"start":52,"end":59}},"defaultValue":{"kind":"StringValue","value":"current","block":false,"loc":{"start":62,"end":71}},"directives":[],"loc":{"start":37,"end":71}}],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"service","loc":{"start":79,"end":86}},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id","loc":{"start":87,"end":89}},"value":{"kind":"Variable","name":{"kind":"Name","value":"id","loc":{"start":92,"end":94}},"loc":{"start":91,"end":94}},"loc":{"start":87,"end":94}}],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"implementingServices","loc":{"start":104,"end":124}},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"graphVariant","loc":{"start":125,"end":137}},"value":{"kind":"Variable","name":{"kind":"Name","value":"graphVariant","loc":{"start":140,"end":152}},"loc":{"start":139,"end":152}},"loc":{"start":125,"end":152}}],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"__typename","loc":{"start":164,"end":174}},"arguments":[],"directives":[],"loc":{"start":164,"end":174}},{"kind":"InlineFragment","typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"FederatedImplementingServices","loc":{"start":190,"end":219}},"loc":{"start":190,"end":219}},"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"services","loc":{"start":232,"end":240}},"arguments":[],"directives":[],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"graphID","loc":{"start":255,"end":262}},"arguments":[],"directives":[],"loc":{"start":255,"end":262}},{"kind":"Field","name":{"kind":"Name","value":"graphVariant","loc":{"start":275,"end":287}},"arguments":[],"directives":[],"loc":{"start":275,"end":287}},{"kind":"Field","name":{"kind":"Name","value":"name","loc":{"start":300,"end":304}},"arguments":[],"directives":[],"loc":{"start":300,"end":304}},{"kind":"Field","name":{"kind":"Name","value":"url","loc":{"start":317,"end":320}},"arguments":[],"directives":[],"loc":{"start":317,"end":320}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt","loc":{"start":333,"end":342}},"arguments":[],"directives":[],"loc":{"start":333,"end":342}}],"loc":{"start":241,"end":354}},"loc":{"start":232,"end":354}}],"loc":{"start":220,"end":364}},"loc":{"start":183,"end":364}}],"loc":{"start":154,"end":372}},"loc":{"start":104,"end":372}}],"loc":{"start":96,"end":378}},"loc":{"start":79,"end":378}}],"loc":{"start":73,"end":382}},"loc":{"start":3,"end":382}}]}}`
);

describe("client:newextract", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("succeeds writing 0 operations", async () => {
    const { lastFrame, frames, rerender } = executeCommand(ClientExtract, {
      config: {
        client: { name: "hiya" }
      },
      args: { output: "extract.json" },
      project: {
        whenReady: () => true,
        mergedOperationsAndFragmentsForService: []
      }
    });

    // first loading state
    expect(lastFrame()).toMatchInlineSnapshot(`
      "
      ⠋ Extracting operations from project
      "
    `);

    // final state
    await rerender(0);
    expect(lastFrame()).toMatchInlineSnapshot(`
      "
      ✔ Extracting operations from project
      ✔ Outputing extracted queries to extract.json

      Successfully wrote 0 operations from the hiya client to extract.json"
    `);

    // writeFileSync was called with the correct fileName and contents
    expect(require("fs").writeFileSync.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "extract.json",
        "{
        \\"version\\": 2,
        \\"operations\\": []
      }",
      ]
    `);
  });

  it("succeeds writing 1 operation", async () => {
    const { lastFrame, rerender } = executeCommand(ClientExtract, {
      config: {
        client: { name: "hiya" }
      },
      args: { output: "extract.json" },
      project: {
        whenReady: () => true,
        mergedOperationsAndFragmentsForService: mockOperationDocument
      }
    });

    // first loading state
    expect(lastFrame()).toMatchInlineSnapshot(`
      "
      ⠋ Extracting operations from project
      "
    `);

    // final state
    await rerender(0);
    expect(lastFrame()).toMatchInlineSnapshot(`
      "
      ✔ Extracting operations from project
      ✔ Outputing extracted queries to extract.json

      Successfully wrote 1 operations from the hiya client to extract.json"
    `);

    // writeFileSync was called with the correct fileName and contents
    expect(require("fs").writeFileSync.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "extract.json",
        "{
        \\"version\\": 2,
        \\"operations\\": [
          {
            \\"signature\\": \\"3c15bb82f8ee3bf5f5831bccec810a9ed0c9de9e9b11d2811edb9b6e7f8d7994\\",
            \\"document\\": \\"query ListServicesReact($graphVariant:String!=\\\\\\"\\\\\\",$id:ID!){service(id:$id){implementingServices(graphVariant:$graphVariant){__typename...on FederatedImplementingServices{services{graphID graphVariant name updatedAt url}}}}}\\",
            \\"metadata\\": {
              \\"engineSignature\\": \\"\\"
            }
          }
        ]
      }",
      ]
    `);
  });
});
