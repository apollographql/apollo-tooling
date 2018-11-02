import { GraphQLProject } from "./base";
import {
  GraphQLSchema,
  printSchema,
  buildSchema,
  Source,
  TypeInfo,
  visit,
  visitWithTypeInfo,
  FragmentDefinitionNode,
  Kind,
  FragmentSpreadNode,
  extendSchema,
  print,
  parse,
  DocumentNode
} from "graphql";

import { rangeForASTNode } from "../utilities/source";
import { formatMS } from "../format";
import { LoadingHandler } from "../loadingHandler";
import { FileSet } from "../fileSet";

import {
  ApolloEngineClient,
  FieldStats,
  SchemaTag,
  ServiceID
} from "../engine";
import { ClientConfigFormat, getServiceName } from "../config";
import { SchemaResolveConfig } from "../schema/providers";

import { NotificationHandler, Diagnostic } from "vscode-languageserver";
import { collectExecutableDefinitionDiagnositics } from "../diagnostics";

function schemaHasASTNodes(schema: GraphQLSchema): boolean {
  const queryType = schema && schema.getQueryType();
  return !!(queryType && queryType.astNode);
}

export function isClientProject(
  project: GraphQLProject
): project is GraphQLClientProject {
  return project instanceof GraphQLClientProject;
}

export class GraphQLClientProject extends GraphQLProject {
  public rootPath: string;
  public serviceID?: string;
  public schema?: GraphQLSchema;

  async resolveSchema(config: SchemaResolveConfig): Promise<GraphQLSchema> {
    // XXX cache the merging of these
    return extendSchema(
      await this.schemaProvider.resolveSchema(config),
      this.clientSchema
    );
  }

  get clientSchema(): DocumentNode {
    return parse(this.typeSystemDefinitionsAndExtensions.map(print).join("\n"));
  }

  private _onDecorations?: (any: any) => void;
  private _onSchemaTags?: NotificationHandler<[ServiceID, SchemaTag[]]>;

  private engineClient?: ApolloEngineClient;
  private fieldStats?: FieldStats;

  constructor(
    config: ClientConfigFormat,
    loadingHandler: LoadingHandler,
    rootPath: string
  ) {
    const fileSet = new FileSet({
      rootPath,
      includes: config.client.includes,
      excludes: config.client.excludes
    });

    super(config, fileSet, loadingHandler);
    this.rootPath = rootPath;

    const { engine } = this.config;
    if (!engine || !engine.engineApiKey) {
      this.loadingHandler.showError(
        "Apollo: failed to load Engine stats. No ENGINE_API_KEY found in .env"
      );
    }

    this.engineClient = new ApolloEngineClient(
      engine!.engineApiKey!,
      engine!.endpoint!
    );
    this.loadEngineData();
  }

  get displayName(): string {
    return getServiceName(this.config) || "<Unnamed>";
  }

  initialize() {
    return [this.scanAllIncludedFiles(), this.loadSchema()];
  }

  onDecorations(handler: (any: any) => void) {
    this._onDecorations = handler;
  }

  onSchemaTags(handler: NotificationHandler<[ServiceID, SchemaTag[]]>) {
    this._onSchemaTags = handler;
  }

  async updateSchemaTag(tag: SchemaTag) {
    this.loadSchema(tag);
  }

  private async loadSchema(tag: SchemaTag = "current") {
    const schemaName = this.displayName;
    if (!schemaName) return;

    await this.loadingHandler.handle(
      `Loading schema for ${this.displayName}`,
      (async () => {
        const schema = await this.resolveSchema({ tag });

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
      })()
    );
  }

  validate() {
    if (!this._onDiagnostics) return;
    if (!this.schema) return;

    const fragments = this.fragments;

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
      }

      this._onDiagnostics({ uri, diagnostics });

      this.generateDecorations();
    }
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
        this._onSchemaTags && this._onSchemaTags([serviceID, schemaTags]);
        this.fieldStats = fieldStats;

        this.generateDecorations();
      })()
    );
  }

  generateDecorations() {
    if (!this._onDecorations) return;
    if (!this.schema) return;

    const decorations: any[] = [];

    for (const [uri, queryDocumentsForFile] of this.documentsByFile) {
      for (const queryDocument of queryDocumentsForFile) {
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
    }

    this._onDecorations(decorations);
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
}
