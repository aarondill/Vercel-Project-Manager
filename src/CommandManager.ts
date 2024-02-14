import * as vscode from "vscode";
import type { VercelManager } from "./features/VercelManager";

export interface Command extends vscode.Disposable {
  readonly id: string;
  dispose(): unknown;
  execute(...args: unknown[]): Thenable<unknown>;
}
export interface CommandConstructable {
  new (vercel: VercelManager): Command;
}

export class CommandManager implements vscode.Disposable {
  private readonly disposables = new Map<string, vscode.Disposable>();
  private readonly commands = new Map<string, Command>();
  private readonly commandArgs;
  constructor(...args: ConstructorParameters<CommandConstructable>) {
    this.commandArgs = args;
  }

  public getAll = (): Command[] => [...this.commands.values()];
  public get = (id?: string): Command | undefined =>
    id ? this.commands.get(id) : undefined; // empty strings aren't allowed

  public clear = (): this => {
    for (const map of [this.commands, this.disposables]) {
      for (const d of map.values()) d.dispose();
      map.clear();
    }
    return this;
  };
  public remove = (id: string): this => {
    for (const map of [this.commands, this.disposables]) {
      map.get(id)?.dispose();
      map.delete(id);
    }
    return this;
  };

  // disposes of the command given
  // if no id given, disposes all commands
  public dispose = (id?: string): this =>
    id === undefined ? this.clear() : this.remove(id);

  private normalizeCommand = (
    command: CommandConstructable | Command
  ): Command => {
    return typeof command === "function"
      ? new command(...this.commandArgs)
      : command;
  };
  public register = (command: CommandConstructable | Command): this =>
    this.registerCommand(this.normalizeCommand(command));
  // Pass a module or array of classes to register
  // Ex: import("./commands").then(registerAll)
  public registerAll = (
    module: { [key: string]: CommandConstructable } | CommandConstructable[]
  ): this => {
    const commands = Array.isArray(module) ? module : Object.values(module);
    commands.forEach(this.register);
    return this;
  };

  private registerCommand = (command: Command): this => {
    const { id, execute } = command;
    if (!id) throw new Error("Command must have a non-empty id!");
    if (this.disposables.has(id)) return this;
    const disp = vscode.commands.registerCommand(id, execute, command);
    this.disposables.set(id, disp);
    this.commands.set(id, command);
    return this;
  };
}
