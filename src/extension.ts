import * as vscode from "vscode";
import { CommandManager } from "./CommandManager";
import * as commands from "./commands";
import { DeploymentsProvider } from "./features/DeploymentsProvider";
import { LogPanelManager } from "./features/LogPanelManager";
import { TokenManager } from "./features/TokenManager";
import { VercelManager } from "./features/VercelManager";
const getProjectIdFromJson = async (): Promise<string | undefined> => {
	const parseError = (error: unknown): string => {
		if (error instanceof Error) {
			return error.message;
		}

		return `${error as string}`;
	};
	if (!vscode.workspace.workspaceFolders?.[0]) {
		return undefined;
	}
	const wf = vscode.workspace.workspaceFolders[0].uri.path;
	const filePath = `${wf}/.vercel/project.json`;
	const fileUri: vscode.Uri = vscode.Uri.file(filePath);
	let vercelProjectJson: Uint8Array | null = null;
	try {
		vercelProjectJson = await vscode.workspace.fs.readFile(fileUri);
	} catch {
		await vscode.window.showErrorMessage(
			"Could not find .vercel/project.json file."
		);
		return undefined;
	}
	try {
		const stringJson: string = Buffer.from(vercelProjectJson).toString("utf8");
		const parsedVercelJSON: { projectId?: string } = JSON.parse(stringJson) as {
			projectId?: string;
		};
		return parsedVercelJSON.projectId;
	} catch (error) {
		await vscode.window.showErrorMessage(parseError(error));
		return undefined;
	}
};

export async function activate(context: vscode.ExtensionContext) {
	const token = new TokenManager(context.globalState, {
		onAuthStateChanged: state => {
			vscode.commands.executeCommand("setContext", "vercelLoggedIn", state);
		},
	});
	const id = await getProjectIdFromJson();
	if (id) {
		token.setProject(id);
	}
	const vercel = new VercelManager(token);

	const deployments = new DeploymentsProvider(vercel);
	const logPanelManager = new LogPanelManager(vercel, context, token);

	context.subscriptions.push(
		vscode.window.registerWebviewPanelSerializer(
			"vercel.logView",
			logPanelManager
		)
	);

	vscode.window.createTreeView("vercel-deployments", {
		treeDataProvider: deployments,
		showCollapseAll: true,
	});

	context.subscriptions.push(registerCommands(vercel, logPanelManager));
}
function registerCommands(
	vercel: VercelManager,
	logPanelManager: LogPanelManager
): vscode.Disposable {
	const commandManager = new CommandManager();
	commandManager.register(new commands.LogIn(vercel));
	commandManager.register(new commands.LogOut(vercel));
	commandManager.register(new commands.OpenLogPanel(logPanelManager));
	commandManager.register(new commands.RefreshLogPanel(logPanelManager));
	commandManager.register(new commands.OpenURL());
	commandManager.register(new commands.CopyURL());
	commandManager.register(new commands.RefreshDeployments(vercel));
	commandManager.register(new commands.VercelDev());

	return commandManager;
}
export function deactivate() {}
