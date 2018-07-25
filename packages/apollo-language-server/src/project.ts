import { extname, relative } from "path";
import { readFileSync } from "fs";

import {
  visit,
  Kind,
  FragmentDefinitionNode,
  TypeSystemDefinitionNode,
  TypeSystemExtensionNode,
  FragmentSpreadNode,
  TypeInfo,
  visitWithTypeInfo,
  GraphQLCompositeType,
  printSchema,
  buildSchema,
  Source
} from "graphql";

import {
  isTypeSystemDefinitionNode,
  isTypeSystemExtensionNode
} from "./utilities/graphql";

import {
  TextDocument,
  NotificationHandler,
  PublishDiagnosticsParams,
  Position,
  Diagnostic
} from "vscode-languageserver";

import { collectDiagnostics } from "./diagnostics";
import { GraphQLDocument, extractGraphQLDocuments } from "./document";

import {
  ApolloConfig,
  resolveDocumentSets,
  ResolvedDocumentSet,
  DocumentSet
} from "apollo/lib/config";
import { engineLink, getIdFromKey } from "apollo/lib/engine";

import { toPromise, execute } from "apollo-link";

import gql from "graphql-tag";

import Uri from "vscode-uri";

import * as minimatch from "minimatch";

export type DocumentUri = string;

import "core-js/fn/array/flat-map";
import { rangeForASTNode } from "./utilities/source";
import { formatMS } from "./format";
declare global {
  interface Array<T> {
    flatMap<U>(
      callbackfn: (value: T, index: number, array: T[]) => U[] | undefined,
      thisArg?: any
    ): U[];
  }
}

const fileAssociations: { [extension: string]: string } = {
  ".graphql": "graphql",
  ".js": "javascript",
  ".ts": "typescript",
  ".jsx": "javascriptreact",
  ".tsx": "typescriptreact"
};

const engineStatsQuery = gql`
  query EngineSchemaStats($id: ID!) {
    service(id: $id) {
      report(from: "-3600", to: "-0") {
        usageStats {
          types {
            name
            fields {
              name
              latencyHistogram {
                serviceTimeP95: durationMs(percentile: 0.95)
              }
            }
          }
        }
      }
    }
  }
`;

export interface DocumentAndSet {
  doc: GraphQLDocument;
  set: ResolvedDocumentSet;
}

export class GraphQLProject {
  public config: ApolloConfig = (null as any) as ApolloConfig;
  private _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;
  private _onDecorations?: (any: any) => void;

  public isReady = false;
  public readyPromise: Promise<void> | undefined = undefined;
  private needsValidation = false;

  private setToResolved: Map<DocumentSet, ResolvedDocumentSet> = new Map();
  private documentSets: ResolvedDocumentSet[] | undefined;
  private documentsByFile: Map<
    DocumentUri,
    { set: ResolvedDocumentSet; docs: GraphQLDocument[] }
  > = new Map();
  private engineStats: Map<
    string,
    Map<string, Map<string, number>>
  > = new Map();

  constructor(config: ApolloConfig, public configFile: string) {
    this.updateConfig(config);
  }

  updateConfig(newConfig: ApolloConfig) {
    this.needsValidation = true;
    this.config = newConfig;

    this.documentSets = undefined;
    this.engineStats.clear();
    this.documentsByFile = new Map();
    this.setToResolved.clear();

    this.readyPromise = this.loadEngineStats()
      .then(() => this.scanAllIncludedFiles())
      .catch(error => {
        console.error(error);
      });
  }

  get displayName(): string {
    return this.config.name || "";
  }

  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
    this._onDiagnostics = handler;
  }

  onDecorations(handler: (any: any) => void) {
    this._onDecorations = handler;
  }

  includesFile(uri: DocumentUri) {
    return this.includesPath(Uri.parse(uri).fsPath);
  }

  private setThatIncludes(filePath: string): ResolvedDocumentSet | undefined {
    const set = (this.config.queries || []).find(
      s =>
        s.includes.some(i =>
          minimatch(relative(this.config.projectFolder, filePath), i)
        ) &&
        !s.excludes.some(e =>
          minimatch(relative(this.config.projectFolder, filePath), e)
        )
    );

    return set ? this.setToResolved.get(set) : undefined;
  }

  private includesPath(filePath: string) {
    return !!this.setThatIncludes(filePath);
  }

  async loadEngineStats() {
    await Promise.all(
      Object.values(this.config.schemas!).map(async schemaDef => {
        if (schemaDef.engineKey) {
          const engineData = await toPromise(
            execute(engineLink, {
              query: engineStatsQuery,
              variables: {
                id: getIdFromKey(schemaDef.engineKey!)
              },
              context: {
                headers: { ["x-api-key"]: schemaDef.engineKey },
                ...(this.config.engineEndpoint && {
                  uri: this.config.engineEndpoint
                })
              }
            })
          );

          const schemaEngineStats = new Map<string, Map<string, number>>();
          engineData.data!.service.report.usageStats.types.forEach(
            (typ: any) => {
              const fieldsMap = new Map<string, number>();
              typ.fields.forEach((field: any) => {
                fieldsMap.set(
                  field.name,
                  field.latencyHistogram.serviceTimeP95
                );
              });

              schemaEngineStats.set(typ.name, fieldsMap);
            }
          );

          this.engineStats.set(schemaDef.engineKey, schemaEngineStats);

          return;
        } else {
          return;
        }
      })
    );

    return;
  }

  async scanAllIncludedFiles() {
    console.time(`scanAllIncludedFiles - ${this.displayName}`);

    this.documentSets = await resolveDocumentSets(this.config, true);

    for (const set of this.documentSets) {
      if (set.schema!.getQueryType()!.astNode) {
        set.schema = set.schema!;
      } else {
        const schemaSource = printSchema(set.schema!, {
          commentDescriptions: true
        });

        set.schema = buildSchema(
          new Source(
            schemaSource,
            `graphql-schema:/schema.graphql?${encodeURIComponent(schemaSource)}`
          )
        );
      }

      this.setToResolved.set(set.originalSet, set);

      for (const filePath of set.documentPaths) {
        const uri = Uri.file(filePath).toString();

        // If we already have query documents for this file, that means it was either
        // opened or changed before we got a chance to read it.
        if (this.documentsByFile.has(uri)) continue;

        this.fileDidChange(uri, set);
      }
    }

    console.timeEnd(`scanAllIncludedFiles - ${this.displayName}`);

    this.isReady = true;
    this.validateIfNeeded();
  }

  fileDidChange(uri: DocumentUri, set?: ResolvedDocumentSet) {
    const filePath = Uri.parse(uri).fsPath;
    const extension = extname(filePath);
    const languageId = fileAssociations[extension];

    // Don't process files of an unsupported filetype
    if (!languageId) return;

    try {
      const contents = readFileSync(filePath, "utf8");
      const document = TextDocument.create(uri, languageId, -1, contents);
      this.documentDidChange(document, set);
    } catch (error) {
      console.error(error);
    }
  }

  fileWasDeleted(uri: DocumentUri) {
    this.removeGraphQLDocumentsFor(uri);
  }

  documentDidChange(document: TextDocument, set?: ResolvedDocumentSet) {
    const documents = extractGraphQLDocuments(document);

    if (documents) {
      const associatedSet =
        set ||
        (this.documentsByFile.get(document.uri) || { set: undefined }).set ||
        this.setThatIncludes(Uri.parse(document.uri).fsPath);

      if (!associatedSet) {
        return;
      }

      this.documentsByFile.set(document.uri, {
        docs: documents,
        set: associatedSet
      });

      this.invalidate();
    } else {
      this.removeGraphQLDocumentsFor(document.uri);
    }
  }

  private removeGraphQLDocumentsFor(uri: DocumentUri) {
    if (this.documentsByFile.has(uri)) {
      this.documentsByFile.delete(uri);
      const filePath = Uri.parse(uri).fsPath;
      (this.documentSets || []).forEach(s => {
        s.documentPaths = s.documentPaths.filter(p => p !== filePath);
      });

      if (this._onDiagnostics) {
        this._onDiagnostics({ uri: uri, diagnostics: [] });
      }

      this.invalidate();
    }
  }

  private invalidate() {
    if (!this.needsValidation && this.isReady) {
      setTimeout(() => {
        this.validateIfNeeded();
      }, 0);
    }
    this.needsValidation = true;
  }

  private validateIfNeeded() {
    if (!this.needsValidation || !this._onDiagnostics || !this.documentSets)
      return;

    const fragments = this.fragments;

    const decorations: any[] = [];
    for (const [uri, { set, docs: queryDocumentsForFile }] of this
      .documentsByFile) {
      const diagnostics: Diagnostic[] = [];
      for (const queryDocument of queryDocumentsForFile) {
        diagnostics.push(
          ...collectDiagnostics(set.schema!, queryDocument, fragments)
        );

        if (queryDocument.ast && this.engineStats && set.engineKey) {
          const typeInfo = new TypeInfo(set.schema!);
          visit(
            queryDocument.ast,
            visitWithTypeInfo(typeInfo, {
              enter: node => {
                if (node.kind == "Field" && typeInfo.getParentType()) {
                  const parentName = (typeInfo.getParentType() as GraphQLCompositeType)
                    .name;
                  const parentEngineStat = this.engineStats
                    .get(set.engineKey!)!
                    .get(parentName);
                  const engineStat = parentEngineStat
                    ? parentEngineStat.get(node.name.value)
                    : undefined;
                  if (engineStat) {
                    decorations.push({
                      document: uri,
                      message: `p95: ${formatMS(engineStat, 3)}`,
                      range: rangeForASTNode(node)
                    });
                  }
                }
              }
            })
          );
        }
      }

      this._onDiagnostics({ uri, diagnostics });
    }

    if (this._onDecorations) {
      this._onDecorations(decorations);
    }

    this.needsValidation = false;
  }

  clearAllDiagnostics() {
    if (!this._onDiagnostics) return;

    for (const uri of this.documentsByFile.keys()) {
      this._onDiagnostics({ uri, diagnostics: [] });
    }
  }

  documentsAt(uri: DocumentUri): DocumentAndSet[] | undefined {
    const gotDoc = this.documentsByFile.get(uri);
    return gotDoc
      ? gotDoc.docs.map(d => {
          return { set: gotDoc.set, doc: d };
        })
      : undefined;
  }

  documentAt(uri: DocumentUri, position: Position): DocumentAndSet | undefined {
    const queryDocuments = this.documentsByFile.get(uri);
    if (!queryDocuments) return undefined;
    const found = queryDocuments.docs.find(document =>
      document.containsPosition(position)
    );
    return found
      ? {
          doc: found,
          set: queryDocuments.set
        }
      : undefined;
  }

  get documents(): GraphQLDocument[] {
    const documents: GraphQLDocument[] = [];
    for (const documentsForFile of this.documentsByFile.values()) {
      documents.push(...documentsForFile.docs);
    }
    return documents;
  }

  get fragments(): { [fragmentName: string]: FragmentDefinitionNode } {
    const fragments = Object.create(null);
    for (const document of this.documents) {
      if (!document.ast) continue;
      for (const definition of document.ast.definitions) {
        if (definition.kind === Kind.FRAGMENT_DEFINITION) {
          fragments[definition.name.value] = definition;
        }
      }
    }
    return fragments;
  }

  fragmentSpreadsForFragment(fragmentName: string): FragmentSpreadNode[] {
    const fragmentSpreads: FragmentSpreadNode[] = [];
    for (const document of this.documents) {
      if (!document.ast) continue;

      visit(document.ast, {
        FragmentSpread(node: FragmentSpreadNode) {
          if (node.name.value === fragmentName) {
            fragmentSpreads.push(node);
          }
        }
      });
    }
    return fragmentSpreads;
  }

  get typeSystemDefinitionsAndExtensions(): (
    | TypeSystemDefinitionNode
    | TypeSystemExtensionNode)[] {
    const definitionsAndExtensions = [];
    for (const document of this.documents) {
      if (!document.ast) continue;
      for (const definition of document.ast.definitions) {
        if (
          isTypeSystemDefinitionNode(definition) ||
          isTypeSystemExtensionNode(definition)
        ) {
          definitionsAndExtensions.push(definition);
        }
      }
    }
    return definitionsAndExtensions;
  }
}
