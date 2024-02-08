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

  const deployments = new DeploymentsProvider(vercel);
  const environment = new EnvironmentProvider(vercel);

  vscode.window.createTreeView("vercel-deployments", {
    treeDataProvider: deployments,
    showCollapseAll: true,
  });

  vscode.window.createTreeView("vercel-environment", {
    treeDataProvider: environment,
    showCollapseAll: true,
  });

  // activate status bar icon
  context.subscriptions.push(new StatusBar(vercel));

  context.subscriptions.push(registerCommands(vercel));
}
function registerCommands(vercel: VercelManager): vscode.Disposable {
  return new CommandManager().registerAll(commands, vercel);
}
export function deactivate() {}
