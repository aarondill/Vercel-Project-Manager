import { Command } from "../../CommandManager";
import { VercelManager } from "../../features/VercelManager";

export class CreateEnvironment implements Command {
	public readonly id = "vercel.createEnvironment";
	constructor(private readonly vercel: VercelManager) {}
	execute() {
		console.log("creating nothing"); //!DEV
		/* 
		TODO! CREATE A VARIABLE
		> Get user input for key
		> Get user input for value
		> post to endpoint to create
	*/
	}
}
