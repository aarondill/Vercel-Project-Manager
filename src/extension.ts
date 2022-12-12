import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("vercel.dev", () => {
			const terminal = vscode.window.createTerminal("vercel dev");
			terminal.show();
			terminal.sendText('(trap "exit 0" EXIT INT  && vercel dev); exit 0');
		})
	);
}

export function deactivate() {}
