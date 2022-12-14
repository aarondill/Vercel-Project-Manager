import * as vscode from "vscode";
import { Command } from "../../CommandManager";
import { VercelManager } from "../../features/VercelManager";

export class OpenEnvironmentLink implements Command {
	public readonly id = "vercel.openEnvironmentLink";
	constructor(private readonly vercel: VercelManager) {}
	async execute() {
		const projectInfo = await this.vercel.project.getInfo();
		const user = await this.vercel.user.getInfo();
		const url = `https://vercel.com/${user.username}/${projectInfo.name}/settings/environment-variables`;
		vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
	}
}
