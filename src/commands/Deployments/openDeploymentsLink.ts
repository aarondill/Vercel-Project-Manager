import * as vscode from "vscode";
import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";

export class OpenDeploymentsLink implements Command {
  public readonly id = "vercel.openDeploymentsLink";
  constructor(private readonly vercel: VercelManager) {}
  async execute() {
    const projectInfo = await this.vercel.project.getInfo();
    if (!projectInfo) return;
    const user = await this.vercel.user.getInfo();
    if (!user)
      return void vscode.window.showErrorMessage("Could not get user info!");
    const url = `https://vercel.com/${user.username}/${projectInfo.name}`;
    await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
  }
}
