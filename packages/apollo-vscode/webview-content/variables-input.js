const vscode = acquireVsCodeApi();
const textArea = document.getElementById("variables");
textArea.oninput = () => {
  textArea.style.height = "";
  textArea.style.height = textArea.scrollHeight + "px";
};
textArea.oninput();

document.getElementById("submit").onclick = () => {
  vscode.postMessage(textArea.value);
};
