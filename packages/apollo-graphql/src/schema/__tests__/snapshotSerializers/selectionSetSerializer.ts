import { print, SelectionNode, isSelectionNode } from "graphql";
import { Plugin } from "pretty-format";

export = (({
  test(value: any) {
    return (
      Array.isArray(value) && value.length > 0 && value.every(isSelectionNode)
    );
  },

  serialize(value: SelectionNode[]): string {
    return String(print(value)).replace(",", "\n");
  }
} as Plugin) as unknown) as jest.SnapshotSerializerPlugin;
