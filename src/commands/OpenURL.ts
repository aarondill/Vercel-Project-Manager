import * as vscode from "vscode";

import { Command } from "../CommandManager";

export class OpenURL implements Command {
	public readonly id = "vercel.openURL";
	execute({ url }: { url: string }) {
		vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
	}
}
