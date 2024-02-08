import * as vscode from "vscode";
import { shellEscape } from "./vercelCommand";

export type TerminalOptions = Omit<
  vscode.TerminalOptions,
  "shellPath" | "shellArgs" | "message"
>;
export class Terminal {
  private term: vscode.Terminal;
  constructor(command: string[], opts: string | TerminalOptions = {}) {
    if (command.length === 0) throw new TypeError("Command cannot be empty");
    this.term = vscode.window.createTerminal({
      hideFromUser: false,
      isTransient: true,
      name: command[0],
      ...(typeof opts === "string" ? { name: opts } : { ...opts }),
      message: `> ${shellEscape(command)}`,
      shellPath: command[0],
      shellArgs: command.slice(1),
    });
    this.show();
  }
  /** @see vscode.Terminal["show"] */
  show(...args: Parameters<vscode.Terminal["show"]>): this {
    this.term.show(...args);
    return this;
  }
  /** @see vscode.Terminal["hide"] */
  hide(...args: Parameters<vscode.Terminal["hide"]>): this {
    this.term.hide(...args);
    return this;
  }
  /** @see vscode.Terminal["dispose"] */
  dispose(...args: Parameters<vscode.Terminal["dispose"]>): this {
    this.term.dispose(...args);
    return this;
  }
  /** @see vscode.Terminal["dispose"] */
  kill = this.dispose;
  /** @see vscode.Terminal["sendText"] */
  sendText(...args: Parameters<vscode.Terminal["sendText"]>): this {
    this.term.sendText(...args);
    return this;
  }
  // Returns a promise that resolves when the terminal has closed.
  get exitStatus(): Promise<vscode.Terminal["exitStatus"]> {
    if (this.term.exitStatus !== undefined)
      return Promise.resolve(this.term.exitStatus);
    return new Promise((resolve, reject) => {
      const termEventListener = vscode.window.onDidCloseTerminal(t => {
        if (t !== this.term) return;
        termEventListener.dispose();
        if (!this.term.exitStatus) return reject("Exit status not available");
        return resolve(this.term.exitStatus);
      });
    });
  }
}
