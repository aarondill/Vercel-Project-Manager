import * as vscode from "vscode";
import { CommandManager } from "./CommandManager";
import * as commands from "./commands";
import { DeploymentsProvider } from "./features/DeploymentsProvider";
import { EnvironmentProvider } from "./features/EnvironmentProvider";
import { StatusBar } from "./features/StatusBar";
import { TokenManager } from "./features/TokenManager";
import { VercelManager } from "./features/VercelManager";

export async function activate(context: vscode.ExtensionContext) {
	const token = new TokenManager(context.globalState, {
		onAuthStateChanged: state => {
			vscode.commands.executeCommand("setContext", "vercelLoggedIn", state);
		},
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
	const commandManager = new CommandManager();
	commandManager.register(new commands.LogIn(vercel));
	commandManager.register(new commands.LogOut(vercel));
	commandManager.register(new commands.CopyURL());
	commandManager.register(new commands.RefreshDeployments(vercel));
	commandManager.register(new commands.VercelDev(vercel));
	commandManager.register(new commands.RefreshEnvironment(vercel));
	commandManager.register(new commands.RemoveEnvironment(vercel));
	commandManager.register(new commands.SetEnvironment(vercel));
	commandManager.register(new commands.CreateEnvironment(vercel));
	commandManager.register(new commands.OpenEnvironmentLink(vercel));
	commandManager.register(new commands.OpenDeploymentsLink(vercel));
	commandManager.register(new commands.VercelLink(vercel));
	commandManager.register(new commands.VercelDeploy(vercel));
	return commandManager;
}
export function deactivate() {}
