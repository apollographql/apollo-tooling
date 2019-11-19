import {
  ListrRenderer,
  ListrTaskObject,
  ListrOptions,
  ListrError
} from "listr";

export class PassthruRenderer<Ctx> implements ListrRenderer {
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
    this._tasks.forEach(task => {
      task.subscribe(
        event => {
          // render to stdout when tasks output "DATA" events, i.e. `task.output = '...'`
          if (event.type === "DATA") {
            console.log(event.data);
          }
        },
        err => {
          // render to stderr on errors
          console.error(err);
        }
      );
    });
  }

  end(err: ListrError<Ctx>) {}
}
