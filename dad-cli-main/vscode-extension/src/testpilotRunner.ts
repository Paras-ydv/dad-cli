import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Locate the runtime-discovery package by walking the workspace.
 * Avoids hardcoding a checkout layout that only worked when the user
 * happened to open the parent folder of the repo.
 */
function findRuntimePath(root: string): string | null {
  const candidates = [
    path.join(root, "runtime-discovery"),
    path.join(root, "testpilot-ai", "runtime-discovery"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return candidate;
    }
  }

  // Fall back to a shallow scan of immediate subdirectories.
  try {
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue;
      }
      const nested = path.join(root, entry.name, "runtime-discovery");
      if (fs.existsSync(path.join(nested, "package.json"))) {
        return nested;
      }
    }
  } catch {
    // Unreadable workspace root - fall through to the null result.
  }

  return null;
}

export async function runTestPilot() {
  const workspace = vscode.workspace.workspaceFolders?.[0];

  if (!workspace) {
    vscode.window.showErrorMessage("Please open a project folder first.");
    return;
  }

  const runtimePath = findRuntimePath(workspace.uri.fsPath);

  if (!runtimePath) {
    vscode.window.showErrorMessage(
      "Could not find the TestPilot runtime-discovery package in this workspace."
    );
    return;
  }

  const url = await vscode.window.showInputBox({
    prompt: "Enter URL to test",
    value: "http://localhost:3000"
  });

  if (!url) return;

  const headful = await vscode.window.showQuickPick(["Yes", "No"], {
    placeHolder: "Show browser window?"
  });

  if (!headful) return;

  const terminal = vscode.window.createTerminal("TestPilot Test");
  terminal.show();

  const headfulFlag = headful === "Yes" ? " --headful" : "";

  // Use && so the command is portable across bash/zsh and PowerShell 7.
  terminal.sendText(`cd "${runtimePath}" && npm run start -- ${url}${headfulFlag}`);
}
