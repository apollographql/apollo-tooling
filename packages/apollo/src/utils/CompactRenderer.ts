import {
  ListrRenderer,
  ListrTaskObject,
  ListrOptions,
  ListrError,
} from "listr";

export class CompactRenderer<Ctx> implements ListrRenderer {
  _tasks: ReadonlyArray<ListrTaskObject<Ctx>>;

  constructor(
    tasks: ReadonlyArray<ListrTaskObject<Ctx>>,
    options: ListrOptions<Ctx>
  ) {
    this._tasks = tasks;
  }

  static get nonTTY() {
    return true;
  }

  render() {
    this._tasks.forEach((task) => {
      task.subscribe((event) => {
        if (
          event.type === "STATE" &&
          (task.state === "completed" || task.state === "failed")
        ) {
          console.log(task.title);
        }
      });
    });
  }

  end(err: ListrError<Ctx>) {}
}
