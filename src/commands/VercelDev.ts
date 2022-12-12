import { window } from "vscode";
import { Command } from "../CommandManager";

export class VercelDev implements Command {
	public readonly id = "vercel.dev";
	constructor() {}
	execute() {
		const terminal = window.createTerminal("vercel dev");
		terminal.show();
		terminal.sendText('(trap "exit 0" EXIT INT  && vercel dev); exit 0');
	}
}
