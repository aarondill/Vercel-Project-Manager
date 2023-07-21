import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";

export class RefreshDeployments implements Command {
  public readonly id = "vercel.refreshDeployments";
  constructor(private readonly vercel: VercelManager) {}
  execute() {
    this.vercel.onDidDeploymentsUpdated();
  }
}
