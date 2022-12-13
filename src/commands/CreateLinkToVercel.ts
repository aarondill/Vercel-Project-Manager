import { Command } from "../CommandManager";
import { VercelManager } from "../features/VercelManager";
import { Terminal } from "../utils/Terminal";

export class CreateLinkToVercel implements Command {
	public readonly id = "vercel.createLinkToVercel";
	constructor(private readonly vercel: VercelManager) {}
	execute() {
		const code = [
			`echo && echo "Type cmd/ctrl/meta + c to quit" && echo`,
			`if npm ls -g vercel &>/dev/null`,
			`then vercel link -t "${this.vercel.auth ?? ""}" `,
			`else echo "The vercel CLI is required for this implementation.` +
				`\nPlease install with npm install -g vercel" && while true`,
			`do : ; done`,
			`fi`,
		];
		const terminal = new Terminal("vercel link");
		terminal.exec({ code, delim: "CONTINUE" });
	}
}
