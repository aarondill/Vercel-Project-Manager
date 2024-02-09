import * as vscode from "vscode";
import { CommandManager } from "./CommandManager";
import * as commands from "./commands";
import { DeploymentsProvider } from "./features/DeploymentsProvider";
import { EnvironmentProvider } from "./features/EnvironmentProvider";
import { StatusBar } from "./features/StatusBar";
import { TokenManager } from "./features/TokenManager";
import { VercelManager } from "./features/VercelManager";

export async function activate(context: vscode.ExtensionContext) {
  const token = new TokenManager(context, {
    onAuthStateChanged: state =>
      vscode.commands.executeCommand("setContext", "vercelLoggedIn", state),
  });
  const vercel = new VercelManager(token);
  vscode.window.createTreeView("vercel-deployments", {
    treeDataProvider: new DeploymentsProvider(vercel),
    showCollapseAll: true,
  });
  vscode.window.createTreeView("vercel-environment", {
    treeDataProvider: new EnvironmentProvider(vercel),
    showCollapseAll: true,
  });
  context.subscriptions.push(new StatusBar(vercel));
  context.subscriptions.push(registerCommands(vercel));
}
function registerCommands(vercel: VercelManager): vscode.Disposable {
  return new CommandManager().registerAll(commands, vercel);
}
export function deactivate() {}
