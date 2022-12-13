import * as vscode from "vscode";
import { Command } from "../../CommandManager";
import { VercelManager } from "../../features/VercelManager";

export class OpenDeploymentsLink implements Command {
	public readonly id = "vercel.openDeploymentsLink";
	constructor(private readonly vercel: VercelManager) {}
	async execute() {
		const projectInfo = await this.vercel.getProjectInfo();
		const user = await this.vercel.getUserInfo();
		const url = `https://vercel.com/${user.username}/${projectInfo.name}`;
		vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
	}
}
