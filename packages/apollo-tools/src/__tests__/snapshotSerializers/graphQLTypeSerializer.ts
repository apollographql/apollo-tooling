import { isNamedType, GraphQLNamedType, printType } from "graphql";
import { Plugin, Config, Refs } from "pretty-format";

export default {
  test(value: any) {
    return value && isNamedType(value);
  },

  serialize(
    value: GraphQLNamedType,
    config: Config,
    indentation: string,
    depth: number,
    refs: Refs,
    printer: any
  ): string {
    return printType(value);
  }
} as Plugin;
