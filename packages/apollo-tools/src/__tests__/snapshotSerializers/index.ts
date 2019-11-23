export { default as astSerializer } from "./astSerializer";
export { default as graphQLTypeSerializer } from "./graphQLTypeSerializer";

declare global {
  namespace jest {
    interface Expect {
      /**
       * Adds a module to format application-specific data structures for serialization.
       */
      addSnapshotSerializer(serializer: import("pretty-format").Plugin): void;
    }
  }
}
