import { ASTNode, print } from "graphql";
import { Plugin, Config, Refs } from "pretty-format";

export default {
  test(value: any) {
    return value && typeof value.kind === "string";
  },

  serialize(
    value: ASTNode,
    config: Config,
    indentation: string,
    depth: number,
    refs: Refs,
    printer: any
  ): string {
    return (
      indentation +
      print(value)
        .trim()
        .replace(/\n/g, "\n" + indentation)
    );
  }
} as Plugin;
