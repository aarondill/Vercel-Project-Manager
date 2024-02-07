import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";
import { Terminal } from "../../utils/Terminal";
import { vercelCommand } from "../../utils/vercelCommand";

export class VercelDev implements Command {
  public readonly id = "vercel.dev";
  constructor(private readonly vercel: VercelManager) {}
  async execute() {
    const code = await vercelCommand(this.vercel, "dev");
    if (!code) return;
    const terminal = new Terminal("vercel dev");
    terminal.exec(code, {
      closeOnSucc: true,
      closeOnError: true,
    });
  }
}
