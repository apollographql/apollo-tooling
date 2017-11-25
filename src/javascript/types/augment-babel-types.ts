/**
 * Augment incomplete definitions in `@types/babel-types`
 */
import 'babel-types';

declare module 'babel-types' {
  interface StringLiteralTypeAnnotation {
    value: string
  }

  interface ObjectTypeAnnotation {
    exact: boolean
  }

  type TSTypeAnnotation = {
    typeAnnotaton: TSType
  }

  type TSType = {
    // TODO: Complete this, or wait for babel-types in DefinitelyTyped to get updated.
  }
}
