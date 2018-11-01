import { extname } from "path";
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
  printSchema,
  buildSchema,
  Source,
  GraphQLSchema
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

import { collectExecutableDefinitionDiagnositics } from "./diagnostics";
import { GraphQLDocument, extractGraphQLDocuments } from "./document";

import { ApolloConfig, resolveSchema } from "apollo/lib/config";

import Uri from "vscode-uri";

export type DocumentUri = string;

import "core-js/fn/array/flat-map";
import { rangeForASTNode } from "./utilities/source";
import { formatMS } from "./format";
import { LoadingHandler } from "./loadingHandler";
import { FileSet } from "./fileSet";
import { ApolloEngineClient, FieldStats, SchemaTag } from "./engine";
import { getIdFromKey } from "apollo/lib/engine";
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

function schemaHasASTNodes(schema: GraphQLSchema): boolean {
  const queryType = schema && schema.getQueryType();
  return !!(queryType && queryType.astNode);
}

export class GraphQLProject {
  private _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;
  private _onDecorations?: (any: any) => void;
  private _onSchemaTags?: (tags: SchemaTag[]) => void;

  public isReady = false;
  private needsValidation = false;

  public serviceID?: string;
  public schema?: GraphQLSchema;

  private fileSet: FileSet;
  private documentsByFile: Map<DocumentUri, GraphQLDocument[]> = new Map();

  private engineClient?: ApolloEngineClient;
  private fieldStats?: FieldStats;

  constructor(
    public config: ApolloConfig,
    private loadingHandler: LoadingHandler
  ) {
    // FIXME: This should take includes and excludes from the new config format.
    const queries = config.queries![0];

    this.fileSet = new FileSet({
      rootPath: config.projectFolder,
      includes: queries.includes,
      excludes: queries.excludes
    });

    this.loadSchema();
    this.scanAllIncludedFiles();

    const engineKey = process.env.ENGINE_API_KEY;
    if (engineKey) {
      this.serviceID = getIdFromKey(engineKey);

      this.engineClient = new ApolloEngineClient(
        engineKey,
        this.config.engineEndpoint
      );
      this.loadEngineData();
    } else {
      this.loadingHandler.showError(
        "Apollo: failed to load Engine stats. No ENGINE_API_KEY found in .env"
      );
    }
  }

  get displayName(): string {
    return this.config.name || "<Unnamed>";
  }

  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
    this._onDiagnostics = handler;
  }

  onDecorations(handler: (any: any) => void) {
    this._onDecorations = handler;
  }

  onSchemaTags(handler: (tags: SchemaTag[]) => void): void {
    this._onSchemaTags = handler;
  }

  async updateSchemaTag(tag: SchemaTag) {
    this.loadSchema(tag);
  }

  private async loadSchema(tag: SchemaTag = "current") {
    // FIXME: This needs to be adapted to the new config format.
    const schemaName =
      this.config.schemas && Object.keys(this.config.schemas)[0];
    if (!schemaName) return;

    await this.loadingHandler.handle(
      `Loading schema for ${this.displayName}`,
      (async () => {
        const schema = await resolveSchema({
          name: schemaName,
          config: this.config,
          tag
        });

        if (!schema) return;

        if (!schemaHasASTNodes(schema)) {
          const schemaSource = printSchema(schema);

          this.schema = buildSchema(
            // rebuild the schema from a generated source file and attach the source to a graphql-schema
            // URI that can be loaded as an in-memory file by VSCode
            new Source(
              schemaSource,
              `graphql-schema:/schema.graphql?${encodeURIComponent(
                schemaSource
              )}`
            )
          );
        } else {
          this.schema = schema;
        }
        this.validateIfNeeded();
      })()
    );
  }

  async loadEngineData() {
    const engineClient = this.engineClient;
    if (!engineClient) return;

    const serviceID = this.serviceID;
    if (!serviceID) return;

    await this.loadingHandler.handle(
      `Loading Engine data for ${this.displayName}`,
      (async () => {
        const [
          schemaTags,
          fieldStats
        ] = await engineClient.loadSchemaTagsAndFieldStats(serviceID);
        this._onSchemaTags && this._onSchemaTags(schemaTags);
        this.fieldStats = fieldStats;
      })()
    );
  }

  includesFile(uri: DocumentUri) {
    return this.fileSet.includesFile(Uri.parse(uri).fsPath);
  }

  async scanAllIncludedFiles() {
    console.time(`scanAllIncludedFiles - ${this.displayName}`);

    await this.loadingHandler.handle(
      `Loading queries for ${this.displayName}`,
      (async () => {
        for (const filePath of this.fileSet.allFiles()) {
          const uri = Uri.file(filePath).toString();

          // If we already have query documents for this file, that means it was either
          // opened or changed before we got a chance to read it.
          if (this.documentsByFile.has(uri)) continue;

          this.fileDidChange(uri);
        }

        console.timeEnd(`scanAllIncludedFiles - ${this.displayName}`);

        this.isReady = true;
        this.validateIfNeeded();
      })()
    );
  }

  fileDidChange(uri: DocumentUri) {
    const filePath = Uri.parse(uri).fsPath;
    const extension = extname(filePath);
    const languageId = fileAssociations[extension];

    // Don't process files of an unsupported filetype
    if (!languageId) return;

    try {
      const contents = readFileSync(filePath, "utf8");
      const document = TextDocument.create(uri, languageId, -1, contents);
      this.documentDidChange(document);
    } catch (error) {
      console.error(error);
    }
  }

  fileWasDeleted(uri: DocumentUri) {
    this.removeGraphQLDocumentsFor(uri);
  }

  documentDidChange(document: TextDocument) {
    const documents = extractGraphQLDocuments(document);

    if (documents) {
      this.documentsByFile.set(document.uri, documents);
      this.invalidate();
    } else {
      this.removeGraphQLDocumentsFor(document.uri);
    }
  }

  private removeGraphQLDocumentsFor(uri: DocumentUri) {
    if (this.documentsByFile.has(uri)) {
      this.documentsByFile.delete(uri);

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
    if (!this.needsValidation || !this._onDiagnostics) return;

    if (!this.schema) return;

    const fragments = this.fragments;

    const decorations: any[] = [];

    for (const [uri, queryDocumentsForFile] of this.documentsByFile) {
      const diagnostics: Diagnostic[] = [];
      for (const queryDocument of queryDocumentsForFile) {
        diagnostics.push(
          ...collectExecutableDefinitionDiagnositics(
            this.schema,
            queryDocument,
            fragments
          )
        );

        if (queryDocument.ast && this.fieldStats) {
          const fieldStats = this.fieldStats;
          const typeInfo = new TypeInfo(this.schema);
          visit(
            queryDocument.ast,
            visitWithTypeInfo(typeInfo, {
              enter: node => {
                if (node.kind == "Field" && typeInfo.getParentType()) {
                  const parentName = typeInfo.getParentType()!.name;
                  const parentEngineStat = fieldStats.get(parentName);
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

  documentsAt(uri: DocumentUri): GraphQLDocument[] | undefined {
    return this.documentsByFile.get(uri);
  }

  documentAt(
    uri: DocumentUri,
    position: Position
  ): GraphQLDocument | undefined {
    const queryDocuments = this.documentsByFile.get(uri);
    if (!queryDocuments) return undefined;

    return queryDocuments.find(document => document.containsPosition(position));
  }

  get documents(): GraphQLDocument[] {
    const documents: GraphQLDocument[] = [];
    for (const documentsForFile of this.documentsByFile.values()) {
      documents.push(...documentsForFile);
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
