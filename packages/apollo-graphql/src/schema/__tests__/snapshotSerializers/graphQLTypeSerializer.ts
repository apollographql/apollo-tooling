import { isNamedType, GraphQLNamedType, printType } from "graphql";
import { Plugin } from "pretty-format";

export = (({
  test(value: any) {
    return value && isNamedType(value);
  },

  serialize(value: GraphQLNamedType): string {
    return printType(value);
  }
} as Plugin) as unknown) as jest.SnapshotSerializerPlugin;
