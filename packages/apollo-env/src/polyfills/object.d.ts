interface ObjectConstructor {
  fromEntries<K extends string, V>(map: [K, V][]): Record<K, V>;
}
