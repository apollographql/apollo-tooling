import { GraphQLProject } from "./project";

export class GraphQLServiceProject extends GraphQLProject {
  get displayName() {
    return "service";
  }

  validate() {}
}
