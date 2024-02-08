import * as vscode from "vscode";
import type { VercelManager } from "./features/VercelManager";

export interface Command {
  readonly id: string;
  execute(...args: unknown[]): Thenable<unknown>;
}
export interface CommandConstructable {
  new (vercel: VercelManager): Command;
}

export class CommandManager implements vscode.Disposable {
  private readonly commands = new Map<string, vscode.Disposable>();

  // disposes of the command given
  // if no id given, disposes all commands
  public dispose(id?: string): this {
    if (typeof id === "string") {
      this.commands.get(id)?.dispose();
      this.commands.delete(id);
      return this;
    }
    for (const registration of this.commands.values()) registration.dispose();
    this.commands.clear();
    return this;
  }

  public register(command: Command): this {
    this.registerCommand(command.id, command.execute, command);
    return this;
  }
  // Pass a module or array of classes to register
  // Ex: import("./commands").then(registerAll)
  public registerAll(
    module: { [key: string]: CommandConstructable } | CommandConstructable[],
    ...args: ConstructorParameters<CommandConstructable>
  ): this {
    const commands = Array.isArray(module) ? module : Object.values(module);
    for (const command of commands) this.register(new command(...args));
    return this;
  }

  private registerCommand(
    id: string,
    impl: (...args: unknown[]) => void,
    thisArg?: unknown
  ) {
    if (this.commands.has(id)) return;
    this.commands.set(id, vscode.commands.registerCommand(id, impl, thisArg));
  }
}
