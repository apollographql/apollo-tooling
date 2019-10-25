import { GraphQLProject } from "./base";
import { FileSet } from "../fileSet";
import { GraphQLServiceProject, GraphQLServiceProjectConfig } from "./service";
import { GraphQLClientProject } from "./client";

export interface GraphQLServiceAndClientProject {
  serviceProject: GraphQLServiceProject;
  clientProject: GraphQLClientProject;
}
