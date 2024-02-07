import * as vscode from "vscode";
const isWin = process.platform === "win32";

export class Terminal {
  private term: vscode.Terminal;
  constructor(opts: string | vscode.TerminalOptions = {}) {
    const options = typeof opts === "string" ? { name: opts } : opts;
    options.hideFromUser ??= true;
    options.isTransient ??= true;
    this.term = vscode.window.createTerminal(options);
  }
  /** @see vscode.Terminal.show */
  show: vscode.Terminal["show"] = (...args) => this.term.show(...args);
  /** @see vscode.Terminal.hide */
  hide: vscode.Terminal["hide"] = (...args) => this.term.hide(...args);
  /** @see vscode.Terminal.dispose */
  dispose: vscode.Terminal["dispose"] = (...args) => this.term.dispose(...args);
  /** @see vscode.Terminal.dispose */
  kill = this.dispose;

  /**
   * @param {codeOpts} code String to execute, or array of strings and action to do upon failure
   * @param closeOnSucc Whether to close the terminal on Success, default true
   * @param closeOnError Whether to close the terminal on Error, default false
   */
  exec(code: string, { closeOnSucc = true, closeOnError = false }) {
    const cmd = [];
    if (isWin)
      cmd.push(code); // pwsh? cmd? powershell?
    else {
      // not windows -- assume POSIX shell
      cmd.push(`(${code})`, "ret=$?");
      if (closeOnSucc) cmd.push(`[ $ret -ne 0 ] || exit $ret`);
      if (closeOnError) cmd.push(`[ $ret -nq 0 ] || exit $ret`);
    }
    this.show();
    this.term.sendText(cmd.join(";"), true);

    return this;
  }
}
