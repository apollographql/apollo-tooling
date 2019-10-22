import { ASTNode, print } from "graphql";
import { Plugin, Config } from "pretty-format";

export = (({
  test(value: any) {
    return value && typeof value.kind === "string";
  },

  serialize(value: ASTNode, _config: Config, indentation: string): string {
    return (
      indentation +
      print(value)
        .trim()
        .replace(/\n/g, "\n" + indentation)
    );
  }
} as Plugin) as unknown) as jest.SnapshotSerializerPlugin;
