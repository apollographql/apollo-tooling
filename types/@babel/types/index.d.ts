export * from "babel-types";

declare module "babel-types" {
  export function stringLiteralTypeAnnotation(
    value: string
  ): StringLiteralTypeAnnotation;

  export interface StringLiteralTypeAnnotation {
    value: string;
  }

  export interface ObjectTypeAnnotation {
    exact: boolean;
  }

  export interface ObjectTypeProperty {
    variance?: { kind: "plus" | "minus" };
    optional: boolean;
  }
}
