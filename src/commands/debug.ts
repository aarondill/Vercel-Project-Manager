import type { Command } from "../CommandManager";
import type { VercelManager } from "../features/VercelManager";

export class Debug implements Command {
  public readonly id = "vercel.debug";
  constructor(private readonly vercel: VercelManager) {}
  dispose() {}
  execute() {
    return this.vercel.debug();
  }
}
