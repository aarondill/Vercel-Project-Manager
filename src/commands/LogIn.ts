import * as vscode from "vscode";

import type { Command } from "../CommandManager";
import type { VercelManager } from "../features/VercelManager";

export class LogIn implements Command {
  public readonly id = "vercel.logIn";
  constructor(private readonly vercel: VercelManager) {}
  async execute() {
    const apiToken = vscode.workspace
      .getConfiguration("vercel")
      .get("AccessToken") as string;
    //TODO Add support for signing in through website
    if (apiToken) {
      await this.vercel
        .logIn(apiToken)
        .then(() =>
          vscode.commands.executeCommand(
            "workbench.view.extension.vercel-sidebar"
          )
        );
    } else {
      await vscode.window.showErrorMessage(
        "Please provide vscode-vercel.AccessToken in settings.json."
      );
    }
  }
}
