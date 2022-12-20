import * as vscode from "vscode";

import { Command } from "../CommandManager";
import { VercelManager } from "../features/VercelManager";

export class LogIn implements Command {
	public readonly id = "vercel.logIn";
	constructor(private readonly vercel: VercelManager) {}
	execute() {
		const apiToken = vscode.workspace
			.getConfiguration("vercel")
			.get("AccessToken") as string;
		//TODO Add support for signing in through website
		if (apiToken) {
			this.vercel
				.logIn(apiToken)
				.then(() =>
					vscode.commands.executeCommand(
						"workbench.view.extension.vercel-sidebar"
					)
				);
		} else {
			vscode.window.showErrorMessage(
				"Please provide vscode-vercel.AccessToken in settings.json."
			);
		}
	}
}
