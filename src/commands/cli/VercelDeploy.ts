import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";
import { vercelCommand } from "../../utils/vercelCommand";

export class VercelDeploy implements Command {
  public readonly id = "vercel.deploy";
  constructor(private readonly vercel: VercelManager) {}
  dispose() {}
  async execute() {
    return await vercelCommand(this.vercel, "deploy");
  }
}
