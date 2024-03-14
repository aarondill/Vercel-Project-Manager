import { inspect } from "util";
import { env, window } from "vscode";
import type { Command } from "../CommandManager";
import type { VercelManager } from "../features/VercelManager";
import * as logging from "../logging";

export class Debug implements Command {
  public readonly id = "vercel.debug";
  constructor(private readonly vercel: VercelManager) {}
  dispose() {}
  async execute() {
    const log = inspect(await this.vercel.debug());
    const sep = "-".repeat(20);
    logging.show(false);
    logging.log(sep, "DEBUG: ", log, sep);
    const msg = "Debug information logged to output window";
    const act = await window.showInformationMessage(msg, "Copy");
    if (act === "Copy") return await env.clipboard.writeText(log);
  }
}
