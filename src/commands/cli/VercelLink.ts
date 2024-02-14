import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";
import { vercelCommand } from "../../utils/vercelCommand";

export class VercelLink implements Command {
  public readonly id = "vercel.vercelLink";
  constructor(private readonly vercel: VercelManager) {}
  dispose() {}
  async execute() {
    return await vercelCommand(this.vercel, "link");
  }
}
