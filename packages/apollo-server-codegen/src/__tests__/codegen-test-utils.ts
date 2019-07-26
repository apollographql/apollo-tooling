import { translate } from "..";
import { file } from "tmp";
import ts from "typescript";
import { writeFile } from "fs";

const write = (file, text) =>
  new Promise(resolve => writeFile(file, text, resolve));

const makeTmpFile = (ext: string) =>
  new Promise<{ name: string; remove: () => void }>((resolve, reject) =>
    file({ postfix: "." + ext }, (err, name, fd, remove) => {
      if (err) reject(err);
      resolve({ name, remove });
    })
  );

const getAllMessageText = (
  message: string | ts.DiagnosticMessageChain
): string => {
  if (typeof message === "string") return message;
  return (
    message.messageText + (message.next ? getAllMessageText(message.next) : "")
  );
};

export const typeCheck = async (sdl, code, debug = false) => {
  const tmp = await makeTmpFile("ts");
  const path = tmp.name;
  const source = translate(sdl, "ts") + code;
  await write(path, source);
  if (debug) console.log(source);

  const program = ts.createProgram([path], {
    strict: true,
    typeRoots: []
  });

  const diagnostics = await ts.getPreEmitDiagnostics(program);
  tmp.remove();

  return diagnostics.map(
    diag =>
      getAllMessageText(diag.messageText) +
      (diag.relatedInformation || []).map(info =>
        getAllMessageText(info.messageText)
      )
  );
};
