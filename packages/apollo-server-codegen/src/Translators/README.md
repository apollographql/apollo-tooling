# Translators

This directory contains the backends of the codegen system, which are responsible for converting from the IR to actual source code in a target language. This project is built around the [visitor pattern](https://en.wikipedia.org/wiki/Visitor_pattern), where IR nodes delegate the responsibility of generating source code to `Translatable` instances (the "visitor"s), which are implemented here.

Currently only a TypeScript backend is provided, but additional backends should be relatively easy to implement by creating an appropriate implementation of the [`Translator`](./index.ts) visitor for the desired target language.
