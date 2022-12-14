import * as vscode from "vscode";

import { Command } from "../CommandManager";

export class CopyURL implements Command {
	public readonly id = "vercel.copyURL";
	execute({ url }: { url: string }) {
		vscode.env.clipboard.writeText(url);
	}
}
