import { Command } from "../../CommandManager";
import { VercelManager } from "../../features/VercelManager";

export class RefreshEnvironment implements Command {
	public readonly id = "vercel.refreshEnvironment";
	constructor(private readonly vercel: VercelManager) {}
	execute() {
		this.vercel.onDidEnvironmentsUpdated();
	}
}
