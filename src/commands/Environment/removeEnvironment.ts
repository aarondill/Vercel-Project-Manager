import { Command } from "../../CommandManager";
import { VercelManager } from "../../features/VercelManager";

export class RemoveEnvironment implements Command {
	public readonly id = "vercel.removeEnvironment";
	constructor(private readonly vercel: VercelManager) {}
	execute(command?: { envId: string }) {
		let toRemove: string | undefined = command?.envId;
		if (!command) {
			//TODO request user input
			toRemove = "The User Input!"; //!DEV
		}
		console.log("removing", toRemove); //!DEV
		// TODO remove the env
	}
}
