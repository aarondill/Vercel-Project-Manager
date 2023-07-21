import type { Command } from "../CommandManager";
import type { VercelManager } from "../features/VercelManager";

export class LogOut implements Command {
  public readonly id = "vercel.logOut";
  constructor(private readonly vercel: VercelManager) {}
  execute() {
    this.vercel.logOut();
  }
}
