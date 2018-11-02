import {
  CancellationToken,
  Position,
  Location,
  CompletionItem,
  Hover,
  Definition,
  CodeLens,
  Command,
  ReferenceContext,
  InsertTextFormat
} from "vscode-languageserver";

// should eventually be moved into this package, since we're overriding a lot of the existing behavior here
import { getAutocompleteSuggestions } from "@apollographql/graphql-language-service-interface";
import {
  getTokenAtPosition,
  getTypeInfo
} from "@apollographql/graphql-language-service-interface/dist/getAutocompleteSuggestions";

import { GraphQLWorkspace } from "./workspace";
import { DocumentUri } from "./project";

import {
  positionFromPositionInContainingDocument,
  rangeForASTNode,
  getASTNodeAndTypeInfoAtPosition
} from "./utilities/source";

import {
  GraphQLNamedType,
  Kind,
  GraphQLField,
  GraphQLNonNull,
  isAbstractType,
  TypeNameMetaFieldDef,
  SchemaMetaFieldDef,
  TypeMetaFieldDef
} from "graphql";
import { highlightNodeForNode } from "./utilities/graphql";
import * as graphql from "graphql";

import Uri from "vscode-uri";
import { resolve } from "path";
import { GraphQLClientProject } from "./clientProject";

function hasFields(type: graphql.GraphQLType): boolean {
  return (
    graphql.isObjectType(type) ||
    (graphql.isListType(type) &&
      hasFields((type as graphql.GraphQLList<any>).ofType)) ||
    (graphql.isNonNullType(type) &&
      hasFields((type as GraphQLNonNull<any>).ofType))
  );
}

function convertToURI(filePath: string, project: GraphQLClientProject) {
  return filePath.startsWith("file:/") ||
    filePath.startsWith("graphql-schema:/")
    ? filePath
    : `file://${resolve(project.config.projectFolder, filePath)}`;
}

export class GraphQLLanguageProvider {
  constructor(public workspace: GraphQLWorkspace) {}

  async provideCompletionItems(
    uri: DocumentUri,
    position: Position,
    _token: CancellationToken
  ): Promise<CompletionItem[]> {
    const project = this.workspace.projectForFile(uri);
    if (!(project && project instanceof GraphQLClientProject)) return [];

    const document = project.documentAt(uri, position);
    if (!(document && document.ast)) return [];

    if (!project.schema) return [];

    const positionInDocument = positionFromPositionInContainingDocument(
      document.source,
      position
    );
    const token = getTokenAtPosition(document.source.body, positionInDocument);
    const state =
      token.state.kind === "Invalid" ? token.state.prevState : token.state;
    const typeInfo = getTypeInfo(project.schema, token.state);

    if (
      state.kind === "SelectionSet" ||
      state.kind === "Field" ||
      state.kind === "AliasedField"
    ) {
      const parentType = typeInfo.parentType;
      const parentFields = {
        ...(parentType.getFields() as {
          [label: string]: GraphQLField<any, any>;
        })
      };

      if (isAbstractType(parentType)) {
        parentFields[TypeNameMetaFieldDef.name] = TypeNameMetaFieldDef;
      }

      if (parentType === project.schema.getQueryType()) {
        parentFields[SchemaMetaFieldDef.name] = SchemaMetaFieldDef;
        parentFields[TypeMetaFieldDef.name] = TypeMetaFieldDef;
      }

      return getAutocompleteSuggestions(
        project.schema,
        document.source.body,
        positionInDocument
      ).map(suggest => {
        // when code completing fields, expand out required variables and open braces
        const suggestedField = parentFields[suggest.label] as GraphQLField<
          void,
          void
        >;
        if (!suggestedField) {
          return suggest;
        } else {
          const requiredArgs = suggestedField.args.filter(
            a => a.type instanceof GraphQLNonNull
          );
          const paramsSection =
            requiredArgs.length > 0
              ? `(${requiredArgs
                  .map((a, i) => `${a.name}: $${i + 1}`)
                  .join(", ")})`
              : ``;

          const snippet = hasFields(suggestedField.type)
            ? `${suggest.label}${paramsSection} {\n\t$0\n}`
            : `${suggest.label}${paramsSection}`;

          return {
            ...suggest,
            insertText: snippet,
            insertTextFormat: InsertTextFormat.Snippet
          };
        }
      });
    } else {
      return getAutocompleteSuggestions(
        project.schema,
        document.source.body,
        positionInDocument
      );
    }
  }

  async provideHover(
    uri: DocumentUri,
    position: Position,
    _token: CancellationToken
  ): Promise<Hover | null> {
    const project = this.workspace.projectForFile(uri);
    if (!(project && project instanceof GraphQLClientProject)) return null;

    const document = project.documentAt(uri, position);
    if (!(document && document.ast)) return null;

    if (!project.schema) return null;

    const positionInDocument = positionFromPositionInContainingDocument(
      document.source,
      position
    );

    const nodeAndTypeInfo = getASTNodeAndTypeInfoAtPosition(
      document.source,
      positionInDocument,
      document.ast,
      project.schema
    );

    if (nodeAndTypeInfo) {
      const [node, typeInfo] = nodeAndTypeInfo;

      switch (node.kind) {
        case Kind.FRAGMENT_SPREAD: {
          const fragmentName = node.name.value;
          const fragment = project.fragments[fragmentName];
          if (fragment) {
            return {
              contents: {
                language: "graphql",
                value: `fragment ${fragmentName} on ${
                  fragment.typeCondition.name.value
                }`
              }
            };
          }
          break;
        }

        case Kind.FIELD: {
          const parentType = typeInfo.getParentType();
          const fieldDef = typeInfo.getFieldDef();

          if (parentType && fieldDef) {
            const argsString =
              fieldDef.args.length > 0
                ? `(${fieldDef.args
                    .map(a => `${a.name}: ${a.type}`)
                    .join(", ")})`
                : "";
            return {
              contents: `
\`\`\`graphql
${parentType}.${fieldDef.name}${argsString}: ${fieldDef.type}
\`\`\`
${fieldDef.description}
`,
              range: rangeForASTNode(highlightNodeForNode(node))
            };
          }

          break;
        }

        case Kind.NAMED_TYPE: {
          const type = project.schema.getType(
            node.name.value
          ) as GraphQLNamedType | void;
          if (!type) break;

          return {
            contents: `
\`\`\`graphql
${String(type)}
\`\`\`
${type.description}
`,
            range: rangeForASTNode(highlightNodeForNode(node))
          };
        }

        case Kind.ARGUMENT: {
          const argumentNode = typeInfo.getArgument()!;
          return {
            contents: `
\`\`\`graphql
${argumentNode.name}: ${argumentNode.type}
\`\`\`
${argumentNode.description}
`,
            range: rangeForASTNode(highlightNodeForNode(node))
          };
        }
      }
    }
    return null;
  }

  async provideDefinition(
    uri: DocumentUri,
    position: Position,
    _token: CancellationToken
  ): Promise<Definition> {
    const project = this.workspace.projectForFile(uri);
    if (!(project && project instanceof GraphQLClientProject)) return null;

    const document = project.documentAt(uri, position);
    if (!(document && document.ast)) return null;

    if (!project.schema) return null;

    const positionInDocument = positionFromPositionInContainingDocument(
      document.source,
      position
    );

    const nodeAndTypeInfo = getASTNodeAndTypeInfoAtPosition(
      document.source,
      positionInDocument,
      document.ast,
      project.schema
    );

    if (nodeAndTypeInfo) {
      const [node, typeInfo] = nodeAndTypeInfo;

      switch (node.kind) {
        case Kind.FRAGMENT_SPREAD:
          const fragmentName = node.name.value;
          const fragment = project.fragments[fragmentName];
          if (fragment && fragment.loc) {
            return {
              uri: convertToURI(fragment.loc.source.name, project),
              range: rangeForASTNode(fragment)
            };
          }
          break;
        case Kind.FIELD: {
          const fieldDef = typeInfo.getFieldDef();

          if (!(fieldDef && fieldDef.astNode && fieldDef.astNode.loc)) break;

          return {
            uri: convertToURI(fieldDef.astNode.loc.source.name, project),
            range: rangeForASTNode(fieldDef.astNode)
          };
        }
        case Kind.NAMED_TYPE: {
          const type = graphql.typeFromAST(project.schema, node);

          if (!(type && type.astNode && type.astNode.loc)) break;

          return {
            uri: convertToURI(type.astNode.loc.source.name, project),
            range: rangeForASTNode(type.astNode)
          };
        }
      }
    }
    return null;
  }

  async provideReferences(
    uri: DocumentUri,
    position: Position,
    _context: ReferenceContext,
    _token: CancellationToken
  ): Promise<Location[] | null> {
    const project = this.workspace.projectForFile(uri);
    if (!(project && project instanceof GraphQLClientProject)) return null;

    const document = project.documentAt(uri, position);
    if (!(document && document.ast)) return null;

    if (!project.schema) return null;

    const positionInDocument = positionFromPositionInContainingDocument(
      document.source,
      position
    );

    const nodeAndTypeInfo = getASTNodeAndTypeInfoAtPosition(
      document.source,
      positionInDocument,
      document.ast,
      project.schema
    );

    if (nodeAndTypeInfo) {
      const [node] = nodeAndTypeInfo;

      switch (node.kind) {
        case Kind.FRAGMENT_DEFINITION: {
          const fragmentName = node.name.value;
          return project.fragmentSpreadsForFragment(fragmentName).reduce(
            (locations, fragmentSpread) => {
              if (fragmentSpread.loc) {
                locations.push({
                  uri: convertToURI(fragmentSpread.loc.source.name, project),
                  range: rangeForASTNode(fragmentSpread)
                });
              }
              return locations;
            },
            [] as Location[]
          );
        }
      }
    }

    return null;
  }

  async provideCodeLenses(
    uri: DocumentUri,
    _token: CancellationToken
  ): Promise<CodeLens[]> {
    const project = this.workspace.projectForFile(uri);
    if (!(project && project instanceof GraphQLClientProject)) return [];

    const documents = project.documentsAt(uri);
    if (!documents) return [];

    let codeLenses: CodeLens[] = [];

    for (const document of documents) {
      if (!document.ast) continue;

      for (const definition of document.ast.definitions) {
        if (definition.kind === Kind.OPERATION_DEFINITION) {
          /*
          if (set.endpoint) {
            const fragmentSpreads: Set<
              graphql.FragmentDefinitionNode
            > = new Set();
            const searchForReferencedFragments = (node: graphql.ASTNode) => {
              visit(node, {
                FragmentSpread(node: FragmentSpreadNode) {
                  const fragDefn = project.fragments[node.name.value];
                  if (!fragDefn) return;

                  if (!fragmentSpreads.has(fragDefn)) {
                    fragmentSpreads.add(fragDefn);
                    searchForReferencedFragments(fragDefn);
                  }
                }
              });
            };

            searchForReferencedFragments(definition);

            codeLenses.push({
              range: rangeForASTNode(definition),
              command: Command.create(
                `Run ${definition.operation}`,
                "apollographql.runQuery",
                graphql.parse(
                  [definition, ...fragmentSpreads]
                    .map(n => graphql.print(n))
                    .join("\n")
                ),
                definition.operation === "subscription"
                  ? set.endpoint.subscriptions
                  : set.endpoint.url,
                set.endpoint.headers,
                graphql.printSchema(set.schema!)
              )
            });
          }
          */
        } else if (definition.kind === Kind.FRAGMENT_DEFINITION) {
          const references = project.fragmentSpreadsForFragment(
            definition.name.value
          );
          const locs = references.reduce(
            (locations, fragmentSpread) => {
              if (fragmentSpread.loc) {
                locations.push({
                  uri: Uri.parse(
                    convertToURI(fragmentSpread.loc.source.name, project)
                  ) as any,
                  range: {
                    startLineNumber:
                      rangeForASTNode(fragmentSpread).start.line + 1,
                    startColumn: rangeForASTNode(fragmentSpread).start
                      .character,
                    endLineNumber: rangeForASTNode(fragmentSpread).end.line + 1,
                    endColumn: rangeForASTNode(fragmentSpread).end.character
                  } as any
                });
              }
              return locations;
            },
            [] as Location[]
          );

          codeLenses.push({
            range: rangeForASTNode(definition),
            command: Command.create(
              `${references.length} references`,
              "editor.action.showReferences",
              Uri.parse(uri),
              {
                lineNumber: rangeForASTNode(definition).start.line + 1,
                column: rangeForASTNode(definition).start.character
              },
              locs
            )
          });
        }
      }
    }
    return codeLenses;
  }
}
