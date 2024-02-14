import * as vscode from "vscode";

import type { Command } from "../CommandManager";

export class CopyURL implements Command {
  public readonly id = "vercel.copyURL";
  dispose() {}
  async execute({ url }: { url: string }) {
    await vscode.env.clipboard.writeText(url);
  }
}
