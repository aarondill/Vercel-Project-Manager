import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";
import { vercelCommand } from "../../utils/vercelCommand";

export class VercelDev implements Command {
  public readonly id = "vercel.dev";
  constructor(private readonly vercel: VercelManager) {}
  async execute() {
    return await vercelCommand(this.vercel, "dev");
  }
}
