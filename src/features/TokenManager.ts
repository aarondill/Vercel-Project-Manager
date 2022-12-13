import * as vscode from "vscode";

export class TokenManager {
	private readonly authKey = "vercel_token";
	private readonly projectKey = "vercel_selected_project";
	private readonly linkKey = "vercel_is_linked_by_file";

	private readonly onAuthStateChanged: (state: boolean) => void;
	private readonly onLinkedStateChanged: (state: boolean) => void;

	constructor(
		private readonly globalState: vscode.Memento,
		{
			onAuthStateChanged,
			onLinkedStateChanged,
		}: {
			onAuthStateChanged: (state: boolean) => void;
			onLinkedStateChanged?: (state: boolean) => void;
		}
	) {
		this.onAuthStateChanged = onAuthStateChanged;
		this.onLinkedStateChanged = onLinkedStateChanged ?? (x => x);
		// initial run
		this.onAuthStateChanged(!!globalState.get(this.authKey));
		this.onLinkedStateChanged(!!globalState.get(this.linkKey));

		/**
		 * add file listener (@link https://code.visualstudio.com/api/references/vscode-api#workspace.createFileSystemWatcher )
		 * call onLinkedStateChanged on change of .vercel/project.json file.
		 */
		const a = "";
	}

	setLinked(token: boolean) {
		this.onLinkedStateChanged(!!token);
		return this.globalState.update(this.linkKey, token);
	}

	getLinked(): boolean {
		return this.globalState.get(this.linkKey) ?? false;
	}

	setAuth(token: string | undefined) {
		this.onAuthStateChanged(!!token);
		return this.globalState.update(this.authKey, token);
	}

	getAuth(): string | undefined {
		return this.globalState.get(this.authKey);
	}

	setProject(token: string | undefined) {
		return this.globalState.update(this.projectKey, token);
	}

	getProject(): string | undefined {
		return this.globalState.get(this.projectKey);
	}
}
