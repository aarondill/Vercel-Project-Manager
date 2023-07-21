import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";

export class RefreshEnvironment implements Command {
  public readonly id = "vercel.refreshEnvironment";
  constructor(private readonly vercel: VercelManager) {}
  execute() {
    this.vercel.onDidEnvironmentsUpdated();
  }
}
