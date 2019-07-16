import { ListrOptions } from "listr";

export class CompactRenderer {
  _tasks: ReadonlyArray<any>;

  constructor(tasks: ReadonlyArray<any>, options: ListrOptions) {
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

  end(err) {}
}
