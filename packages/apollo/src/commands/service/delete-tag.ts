import { flags } from "@oclif/command";
import { ProjectCommand } from "../../Command";

export default class ServiceDeleteTag extends ProjectCommand {
  static description = "Delete a schema tag.";

  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The published tag to check this service against"
    })
  };

  async run() {
    await this.runTasks(({ config, flags, project }) => [
      <any>{
        title: `Deleting schema tag ${flags.tag}`,
        task: async () => {
          if (!config.name) {
            throw new Error("No service found to link to Engine");
          }
          if (!flags.tag) {
            throw new Error("No tag specified to delete");
          }

          const { deleted } = await project.engine.deleteSchemaTag({
            id: config.name,
            tag: flags.tag
          });
          if (deleted) {
            this.log(`Successfully deleted schema tag ${flags.tag}`);
          } else {
            throw new Error(`Could not delete schema tag ${flags.tag}`);
          }
        }
      }
    ]);
  }
}
