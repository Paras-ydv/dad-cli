import * as vscode from "vscode";

export class TestPilotViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(view: vscode.WebviewView) {
    view.webview.options = {
      enableScripts: true
    };

    view.webview.html = `
      <!DOCTYPE html>
      <html>
        <body>
          <h3>TestPilot AI</h3>
          <button id="start">▶ Start TestPilot Test</button>

          <script>
            const vscode = acquireVsCodeApi();
            document.getElementById("start").onclick = () => {
              vscode.postMessage({ command: "start" });
            };
          </script>
        </body>
      </html>
    `;

    view.webview.onDidReceiveMessage(msg => {
      if (msg.command === "start") {
        vscode.commands.executeCommand("testpilot.start");
      }
    });
  }
}
