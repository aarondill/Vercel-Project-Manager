import * as vscode from "vscode";
import { parseError } from "../utils/parseError";

export class TokenManager {
	private readonly authKey = "vercel_token";
	private readonly projectKey = "vercel_selected_project";

	private readonly onAuthStateChanged: (state: boolean) => void;
	public onProjectStateChanged: (id?: string) => void;
	constructor(
		private readonly globalState: vscode.Memento,
		{
			onAuthStateChanged,
			onProjectStateChanged,
		}: {
			onAuthStateChanged: (state: boolean) => void;
			onProjectStateChanged?: (id?: string) => void;
		}
	) {
		this.onAuthStateChanged = onAuthStateChanged;
		this.onProjectStateChanged = onProjectStateChanged ?? (x => x);
		// initial run
		this.onAuthStateChanged(!!globalState.get(this.authKey));

		/**
		 * add file listener (@link https://code.visualstudio.com/api/references/vscode-api#workspace.createFileSystemWatcher )
		 * call onLinkedStateChanged on change of .vercel/project.json file.
		 */
		const ws = vscode.workspace.workspaceFolders?.[0];
		if (!ws) return this;
		const fileWatcher = vscode.workspace.createFileSystemWatcher(
			new vscode.RelativePattern(ws, ".vercel/project.json"),
			false,
			false,
			false
		);
		const folderWatcher = vscode.workspace.createFileSystemWatcher(
			new vscode.RelativePattern(ws, ".vercel/"),
			true,
			true,
			false
		);
		const update = async (path?: vscode.Uri) =>
			await this.setProject(await this.getProjectIdFromJson(path));

		const remove = async (path: vscode.Uri) => this.setProject(undefined);

		fileWatcher.onDidChange(update);
		fileWatcher.onDidCreate(update);
		fileWatcher.onDidDelete(remove);
		folderWatcher.onDidDelete(remove);
		update();
		this.onProjectStateChanged();
	}

	setAuth(token: string | undefined) {
		this.onAuthStateChanged(!!token);
		return this.globalState.update(this.authKey, token);
	}

	getAuth(): string | undefined {
		return this.globalState.get(this.authKey);
	}

	async setProject(token: string | undefined) {
		await this.globalState.update(this.projectKey, token);
		this.onProjectStateChanged(token);
		vscode.commands.executeCommand("setContext", "vercelLinked", !!token);
		return token;
	}

	getProject(): string | undefined {
		return this.globalState.get(this.projectKey);
	}
	private getProjectIdFromJson = async (
		uri?: vscode.Uri
	): Promise<string | undefined> => {
		if (!vscode.workspace.workspaceFolders?.[0]) {
			return undefined;
		}
		const wf = vscode.workspace.workspaceFolders[0].uri.path;
		const filePath = `${wf}/.vercel/project.json`;
		const fileUri: vscode.Uri = uri ?? vscode.Uri.file(filePath);
		let vercelProjectJson: Uint8Array | null = null;
		try {
			vercelProjectJson = await vscode.workspace.fs.readFile(fileUri);
		} catch {
			return undefined;
		}
		try {
			const stringJson: string =
				Buffer.from(vercelProjectJson).toString("utf8");
			const parsedVercelJSON: { projectId?: string } = JSON.parse(
				stringJson
			) as {
				projectId?: string;
			};
			return parsedVercelJSON.projectId;
		} catch (error) {
			await vscode.window.showErrorMessage(parseError(error));
			return undefined;
		}
	};
}
