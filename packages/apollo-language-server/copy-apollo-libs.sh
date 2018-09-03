#!/bin/bash

# When we copy the apollo-language-server into the extension, we also need to make sure
# that the Lerna-managed dependencies are up to date with the local packages, not what's published
# to NPM. So we copy all the local lib folders into the installed NPM packages to get them up to date
# with what we have in the Lerna build.

cp -r ../apollo/lib ../apollo-vscode/server/node_modules/apollo
cp -r ../apollo-codegen-core/lib ../apollo-vscode/server/node_modules/apollo-codegen-core
cp -r ../apollo-codegen-flow-legacy/lib ../apollo-vscode/server/node_modules/apollo-codegen-flow-legacy
cp -r ../apollo-codegen-scala/lib ../apollo-vscode/server/node_modules/apollo-codegen-scala
cp -r ../apollo-codegen-swift/lib ../apollo-vscode/server/node_modules/apollo-codegen-swift
cp -r ../apollo-codegen-typescript/lib ../apollo-vscode/server/node_modules/apollo-codegen-typescript
cp -r ../apollo-codegen-typescript-legacy/lib ../apollo-vscode/server/node_modules/apollo-codegen-typescript-legacy
