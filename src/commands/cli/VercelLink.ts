import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";
import { Terminal } from "../../utils/Terminal";
import { vercelCommand } from "../../utils/vercelCommand";

export class VercelLink implements Command {
  public readonly id = "vercel.vercelLink";
  constructor(private readonly vercel: VercelManager) {}
  async execute() {
    const code = await vercelCommand(this.vercel, "link");
    if (!code) return;
    const terminal = new Terminal("vercel link");
    terminal.exec(code, true, true, true);
  }
}
