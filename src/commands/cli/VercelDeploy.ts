import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";
import { Terminal } from "../../utils/Terminal";
import { vercelCommand } from "../../utils/vercelCommand";

export class VercelDeploy implements Command {
  public readonly id = "vercel.deploy";
  constructor(private readonly vercel: VercelManager) {}
  async execute() {
    const code = await vercelCommand(this.vercel, "deploy");
    if (!code) return;
    const terminal = new Terminal("vercel deploy");
    terminal.exec(code, {
      closeOnSucc: true,
      closeOnError: true,
    });
  }
}
