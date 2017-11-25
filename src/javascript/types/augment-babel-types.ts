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

  /*
    AnyTypeAnnotation | ArrayTypeAnnotation | BooleanTypeAnnotation
      | BooleanLiteralTypeAnnotation | FunctionTypeAnnotation | GenericTypeAnnotation | IntersectionTypeAnnotation
      | MixedTypeAnnotation | NullableTypeAnnotation | NumericLiteralTypeAnnotation | NumberTypeAnnotation
      | StringLiteralTypeAnnotation | StringTypeAnnotation | ThisTypeAnnotation | TupleTypeAnnotation
      | TypeofTypeAnnotation | TypeAnnotation | ObjectTypeAnnotation | UnionTypeAnnotation | VoidTypeAnnotation;
  */
}
