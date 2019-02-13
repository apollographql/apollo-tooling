declare module "pretty-format" {
  export interface Plugin {
    test(value: any): boolean;
    serialize(
      val: any,
      config: Config,
      indentation: string,
      depth: number,
      refs: Refs,
      printer: Printer
    ): string;
  }

  export interface Config {
    callToJSON: boolean;
    colors: Colors;
    escapeRegex: boolean;
    escapeString: boolean;
    indent: string;
    maxDepth: number;
    min: boolean;
    plugins: Plugin[];
    printFunctionName: boolean;
    spacingInner: string;
    spacingOuter: string;
  }

  export type Printer = (
    val: any,
    config: Config,
    indentation: string,
    depth: number,
    refs: Refs,
    hasCalledToJSON?: boolean
  ) => string;

  export type Refs = any[];

  export interface Colors {
    comment: { close: string; open: string };
    content: { close: string; open: string };
    prop: { close: string; open: string };
    tag: { close: string; open: string };
    value: { close: string; open: string };
  }
}
