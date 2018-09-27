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
import { DocumentUri, GraphQLProject } from "./project";

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

function hasFields(type: graphql.GraphQLType): boolean {
  return (
    graphql.isObjectType(type) ||
    (graphql.isListType(type) &&
      hasFields((type as graphql.GraphQLList<any>).ofType)) ||
    (graphql.isNonNullType(type) &&
      hasFields((type as GraphQLNonNull<any>).ofType))
  );
}

function convertToURI(filePath: string, project: GraphQLProject) {
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
    if (!project) return [];

    const docAndSet = project.documentAt(uri, position);
    if (!docAndSet) return [];

    const { doc, set } = docAndSet;

    if (!set.schema) return [];

    const positionInDocument = positionFromPositionInContainingDocument(
      doc.source,
      position
    );
    const token = getTokenAtPosition(doc.source.body, positionInDocument);
    const state =
      token.state.kind === "Invalid" ? token.state.prevState : token.state;
    const typeInfo = getTypeInfo(set.schema, token.state);

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

      if (parentType === set.schema.getQueryType()) {
        parentFields[SchemaMetaFieldDef.name] = SchemaMetaFieldDef;
        parentFields[TypeMetaFieldDef.name] = TypeMetaFieldDef;
      }

      return getAutocompleteSuggestions(
        set.schema,
        doc.source.body,
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
        set.schema,
        doc.source.body,
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
    if (!project) return null;

    const docAndSet = project.documentAt(uri, position);
    if (!(docAndSet && docAndSet.doc.ast)) return null;

    const { doc, set } = docAndSet;

    if (!set.schema) return null;

    const positionInDocument = positionFromPositionInContainingDocument(
      doc.source,
      position
    );

    const nodeAndTypeInfo = getASTNodeAndTypeInfoAtPosition(
      doc.source,
      positionInDocument,
      doc.ast!,
      set.schema
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
          const type = set.schema.getType(
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
    if (!project) return null;

    const docAndSet = project.documentAt(uri, position);
    if (!(docAndSet && docAndSet.doc.ast)) return null;

    const { doc, set } = docAndSet;

    if (!set.schema) return null;

    const positionInDocument = positionFromPositionInContainingDocument(
      doc.source,
      position
    );

    const nodeAndTypeInfo = getASTNodeAndTypeInfoAtPosition(
      doc.source,
      positionInDocument,
      doc.ast!,
      set.schema
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
          const type = graphql.typeFromAST(set.schema!, node);

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
    if (!project) return null;

    const docAndSet = project.documentAt(uri, position);
    if (!(docAndSet && docAndSet.doc.ast)) return null;

    const { doc, set } = docAndSet;

    if (!set.schema) return null;

    const positionInDocument = positionFromPositionInContainingDocument(
      doc.source,
      position
    );

    const nodeAndTypeInfo = getASTNodeAndTypeInfoAtPosition(
      doc.source,
      positionInDocument,
      doc.ast!,
      set.schema
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
    if (!project) return [];

    await project.readyPromise;

    const docsAndSets = project.documentsAt(uri);
    if (!docsAndSets) return [];

    let codeLenses: CodeLens[] = [];

    for (const { doc } of docsAndSets) {
      if (!doc.ast) continue;

      for (const definition of doc.ast.definitions) {
        if (definition.kind === Kind.FRAGMENT_DEFINITION) {
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
