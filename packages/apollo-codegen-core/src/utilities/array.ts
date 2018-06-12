export {};

declare global {
  interface Array<T> {
    flatMap<U>(callbackfn: (value: T, index: number, array: T[]) => U[] | undefined, thisArg?: any): U[];
  }
}

Object.defineProperty(Array.prototype, 'flatMap', {
  value: function<T,U>(this: Array<T>, callbackfn: (value: T, index: number, array: T[]) => U[], thisArg?: any): U[] {
    return [].concat.apply([], this.map(callbackfn, thisArg));
  },
  enumerable: false
});

export function maybePush<T = any>(list: T[], item: T) {
  if (!list.includes(item)) {
    list.push(item);
  }
  return list;
};
