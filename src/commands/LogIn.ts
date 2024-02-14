import * as vscode from "vscode";

import type { Command } from "../CommandManager";
import type { VercelManager } from "../features/VercelManager";
const viewSidebar = () =>
  vscode.commands.executeCommand("workbench.view.extension.vercel-sidebar");

/** @return HasAccessToken */
async function warnDeprecatedConfig() {
  const config = vscode.workspace.getConfiguration("vercel");
  const apiToken = config.get<string>("AccessToken");
  if (!apiToken) return;
  const msg =
    "The vercel.AccessToken configuration has been removed. Auto-removing from configuration.";
  void vscode.window.showWarningMessage(msg);
  await config.update(
    "AccessToken",
    undefined,
    vscode.ConfigurationTarget.Global
  );
}
export class LogIn implements Command {
  public readonly id = "vercel.logIn";
  constructor(private readonly vercel: VercelManager) {}
  dispose() {}
  async execute() {
    await warnDeprecatedConfig();
    await this.vercel.logIn();
    await viewSidebar();
  }
}
