import { extname } from "path";
import { readFileSync } from "fs";

import { TypeSystemDefinitionNode, TypeSystemExtensionNode } from "graphql";

import {
  isTypeSystemDefinitionNode,
  isTypeSystemExtensionNode
} from "./utilities/graphql";

import {
  TextDocument,
  NotificationHandler,
  PublishDiagnosticsParams,
  Position
} from "vscode-languageserver";

import { GraphQLDocument, extractGraphQLDocuments } from "./document";

import {
  ApolloConfigFormat,
  getServiceName,
  selectProjectFromConfig
} from "./config";

import { resolveSchema } from "apollo/lib/config";

import Uri from "vscode-uri";
import { LoadingHandler } from "./loadingHandler";
import { FileSet } from "./fileSet";

export type DocumentUri = string;

const fileAssociations: { [extension: string]: string } = {
  ".graphql": "graphql",
  ".js": "javascript",
  ".ts": "typescript",
  ".jsx": "javascriptreact",
  ".tsx": "typescriptreact"
};

export abstract class GraphQLProject {
  protected _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;

  public isReady = false;
  private needsValidation = false;

  protected documentsByFile: Map<DocumentUri, GraphQLDocument[]> = new Map();

  constructor(
    private fileSet: FileSet,
    protected loadingHandler: LoadingHandler
  ) {}

  abstract get displayName(): string;

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

  protected validateIfNeeded() {
    if (!this.needsValidation) return;

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
