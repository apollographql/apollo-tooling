import { ListrTask, ListrOptions, ListrError } from "listr";

export class CompactRenderer {
  _tasks: ReadonlyArray<ListrTask>;

  constructor(tasks: ReadonlyArray<ListrTask>, options: ListrOptions) {
    this._tasks = tasks;
  }

  static get nonTTY() {
    return true;
  }

  render() {
    this._tasks.forEach(task => {
      task.subscribe(event => {
        if (
          event.type === "STATE" &&
          (task.state === "completed" || task.state === "failed")
        ) {
          console.log(task.title);
        }
      });
    });
  }

  end(err: ListrError) {}
}
