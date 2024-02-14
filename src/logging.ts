import * as vscode from "vscode";

let output: vscode.OutputChannel | null = null;
/** This function initializes the output channel. It must be called before using the module! */
export function activate(context: vscode.ExtensionContext) {
  if (output) return;
  output = vscode.window.createOutputChannel("Vercel Project Manager");
  context.subscriptions.push(output);
}
//Write a line to the output channel.
export const log = (s: string): void => output?.appendLine(s);
export const clear = (): void => output?.clear();
export const show = (preserveFocus?: boolean): void =>
  output?.show(preserveFocus);
export const hide = (): void => output?.hide();
