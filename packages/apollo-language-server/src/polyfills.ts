import "core-js/fn/array/flat-map";

declare global {
  interface Array<T> {
    flat<U>(this: U[][], depth?: 1): U[];
    flatMap<U>(
      callbackfn: (value: T, index: number, array: T[]) => ReadonlyArray<U> | U,
      thisArg?: this
    ): U[];
  }
}
