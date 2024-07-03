import * as vscode from "vscode";
import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";
import getProjectDashboard from "../../utils/dashboard";

export class OpenEnvironmentLink implements Command {
  public readonly id = "vercel.openEnvironmentLink";
  constructor(private readonly vercel: VercelManager) {}
  dispose() {}
  async execute() {
    const url = await getProjectDashboard(
      this.vercel,
      "/settings/environment-variables"
    );
    if (url) await vscode.env.openExternal(url);
  }
}
