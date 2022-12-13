import { Command } from "../../CommandManager";
import { VercelManager } from "../../features/VercelManager";

export class SetEnvironment implements Command {
	public readonly id = "vercel.setEnvironment";
	constructor(private readonly vercel: VercelManager) {}
	execute(key: string) {
		console.log("editing", key); //!DEV
		//TODO! SET A VARIABLE
		//> Get user input for value
		//> patch to endpoint to send value
	}
}
