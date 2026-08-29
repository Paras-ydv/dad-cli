import * as vscode from "vscode";
import { runTestPilot } from "./testpilotRunner";
import { TestPilotViewProvider } from "./testpilotView";

export function activate(context: vscode.ExtensionContext) {
  console.log("TestPilot extension activating");

  // Command
  context.subscriptions.push(
    vscode.commands.registerCommand("testpilot.start", runTestPilot)
  );

  // Status bar button
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100
  );
  statusBarItem.text = "▶ TestPilot Test";
  statusBarItem.tooltip = "Start a TestPilot run";
  statusBarItem.command = "testpilot.start";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);

  // ✅ REGISTER VIEW PROVIDER (THIS FIXES THE ERROR)
  const provider = new TestPilotViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "testpilotView",
      provider,
      { webviewOptions: { retainContextWhenHidden: true } }
    )
  );
}

export function deactivate() {}
