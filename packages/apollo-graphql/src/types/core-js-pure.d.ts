declare module "core-js-pure/features/array/flat" {
  function flat<A>(
    array: A[],
    ...args: Parameters<typeof Array.prototype.flat>
  ): A;
  export = flat;
}
