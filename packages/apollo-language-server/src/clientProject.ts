import { GraphQLProject } from "./project";
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
  FragmentSpreadNode
} from "graphql";

import { rangeForASTNode } from "./utilities/source";
import { formatMS } from "./format";
import { LoadingHandler } from "./loadingHandler";
import { FileSet } from "./fileSet";
import { ApolloEngineClient, FieldStats, SchemaTag, ServiceID } from "./engine";
import { getIdFromKey } from "apollo/lib/engine";
import { ApolloConfig, resolveSchema } from "apollo/lib/config";

import { NotificationHandler, Diagnostic } from "vscode-languageserver";
import { collectExecutableDefinitionDiagnositics } from "./diagnostics";

function schemaHasASTNodes(schema: GraphQLSchema): boolean {
  const queryType = schema && schema.getQueryType();
  return !!(queryType && queryType.astNode);
}

export class GraphQLClientProject extends GraphQLProject {
  public config: ApolloConfig;
  public serviceID?: string;
  public schema?: GraphQLSchema;

  private _onDecorations?: (any: any) => void;
  private _onSchemaTags?: NotificationHandler<[ServiceID, SchemaTag[]]>;

  private engineClient?: ApolloEngineClient;
  private fieldStats?: FieldStats;

  constructor(config: ApolloConfig, loadingHandler: LoadingHandler) {
    // FIXME: This should take includes and excludes from the new config format.
    const queries = config.queries![0];

    const fileSet = new FileSet({
      rootPath: config.projectFolder,
      includes: queries.includes,
      excludes: queries.excludes
    });

    super(fileSet, loadingHandler);

    this.config = config;

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
