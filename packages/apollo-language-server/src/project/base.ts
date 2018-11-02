import { extname } from "path";
import { readFileSync } from "fs";

import {
  TypeSystemDefinitionNode,
  TypeSystemExtensionNode,
  GraphQLSchema
} from "graphql";

import {
  isTypeSystemDefinitionNode,
  isTypeSystemExtensionNode
} from "../utilities/graphql";

import {
  TextDocument,
  NotificationHandler,
  PublishDiagnosticsParams,
  Position
} from "vscode-languageserver";

import { GraphQLDocument, extractGraphQLDocuments } from "../document";

import Uri from "vscode-uri";
import { LoadingHandler } from "../loadingHandler";
import { FileSet } from "../fileSet";
import { ApolloConfigFormat } from "../config";
import {
  schemaProviderFromConfig,
  GraphQLSchemaProvider,
  SchemaResolveConfig
} from "../schema/providers";

export type DocumentUri = string;

const fileAssociations: { [extension: string]: string } = {
  ".graphql": "graphql",
  ".js": "javascript",
  ".ts": "typescript",
  ".jsx": "javascriptreact",
  ".tsx": "typescriptreact"
};

export abstract class GraphQLProject implements GraphQLSchemaProvider {
  public schemaProvider: GraphQLSchemaProvider;
  protected _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;

  private _isReady: boolean;
  private readyPromise: Promise<void>;

  private needsValidation = false;

  protected documentsByFile: Map<DocumentUri, GraphQLDocument[]> = new Map();

  constructor(
    public config: ApolloConfigFormat,
    private fileSet: FileSet,
    protected loadingHandler: LoadingHandler
  ) {
    this.schemaProvider = schemaProviderFromConfig(config);

    this._isReady = false;
    // FIXME: Instead of `Promise.all`, we should catch individual promise rejections
    // so we can show multiple errors.
    this.readyPromise = Promise.all(this.initialize())
      .then(() => {
        this._isReady = true;
        this.invalidate();
      })
      .catch(error => {
        console.error(error);
        this.loadingHandler.showError(
          `Error initializing Apollo GraphQL project "${
            this.displayName
          }": ${error}`
        );
      });
  }

  abstract get displayName(): string;

  protected abstract initialize(): Promise<void>[];

  get isReady(): boolean {
    return this._isReady;
  }

  whenReady(): Promise<void> {
    return this.readyPromise;
  }

  public resolveSchema(config: SchemaResolveConfig): Promise<GraphQLSchema> {
    return this.schemaProvider.resolveSchema(config);
  }

  public onSchemaChange(handler: NotificationHandler<GraphQLSchema>) {
    return this.schemaProvider.onSchemaChange(handler);
  }

  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
    this._onDiagnostics = handler;
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

  protected invalidate() {
    if (!this.needsValidation && this.isReady) {
      setTimeout(() => {
        this.validateIfNeeded();
      }, 0);
      this.needsValidation = true;
    }
  }

  private validateIfNeeded() {
    if (!this.needsValidation || !this.isReady) return;

    this.validate();

    this.needsValidation = false;
  }

  abstract validate(): void;

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
