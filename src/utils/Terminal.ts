import * as vscode from "vscode";
type CodeOptions = {
	/** A list of strings to be combined with a deliminator and ran     */
	code: string[];
	/** Choice of Deliminator between *ALL* inputs; defaults to AND */
	delim?: "AND" | "OR" | "CONTINUE";
};

export class Terminal {
	private term: vscode.Terminal;
	constructor(opts: string | vscode.TerminalOptions = {}) {
		const options = typeof opts === "string" ? { name: opts } : opts;
		options.hideFromUser ??= true;
		options.isTransient ??= true;
		this.term = vscode.window.createTerminal(options);
	}
	hide() {
		this.term.hide();
	}
	kill() {
		this.term.dispose();
	}
	/**
	 * @param {codeOpts} codeOpts String to execute, or array of strings and action to do upon failure
	 * @param closeOnInt Whether to close the terminal on interupt signal (^c), default true
	 * @param closeOnSucc Whether to close the terminal on Success, default true
	 * @param closeOnError Whether to close the terminal on Error, default false
	 */
	exec(
		codeOpts: string | string[] | CodeOptions,
		closeOnInt: boolean = true,
		closeOnSucc: boolean = true,
		closeOnError: boolean = false
	) {
		let run: string;
		if (Array.isArray(codeOpts)) codeOpts = { code: codeOpts };
		if (typeof codeOpts === "object") {
			const { code, delim: onError } = codeOpts;
			if (onError === "OR") run = code.join(" || ");
			else if (onError === "CONTINUE") run = code.join(" ; ");
			else run = code.join(" && ");
		} else run = codeOpts;

		if (closeOnInt)
			run = `(trap "exit \$?" INT && ${run} ); ret=$? ; test $ret -eq 130 && exit 0`;
		else run = `(${run}); ret=$?`;

		if (closeOnSucc) run += ` ; test $ret -eq 0 && exit $ret`;
		if (closeOnError) run += ` ; test $ret -nq 0 && exit $ret`;
		this.term.show();
		this.term.sendText(run, true);
	}
}
