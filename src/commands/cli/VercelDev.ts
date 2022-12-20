import { Command } from "../../CommandManager";
import { VercelManager } from "../../features/VercelManager";
import { Terminal } from "../../utils/Terminal";

export class VercelDev implements Command {
	public readonly id = "vercel.dev";
	constructor(private readonly vercel: VercelManager) {}
	execute() {
		const code = [
			`clear && echo "Type cmd/ctrl/meta + c to quit" && echo`,
			`if ! command -v vercel &>/dev/null`,
			`then echo "The vercel CLI is required for this feature.` +
				`\nPlease install with npm install -g vercel"`,
			`while true; do : ; done`,
			`exit 1`,
			`fi`,
			`vercel dev -t ${this.vercel.auth ?? ""}`,
		];
		const terminal = new Terminal("vercel link");
		terminal.exec({ code, delim: "CONTINUE" }, true, true, true);
	}
}
