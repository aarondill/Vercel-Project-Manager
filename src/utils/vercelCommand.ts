import { window } from "vscode";
import type { VercelManager } from "../features/VercelManager";
import which from "which";
import type { TerminalOptions } from "./Terminal";
import { Terminal } from "./Terminal";

const isWin = process.platform === "win32";
export function shellEscape(arg: string[]): string {
  if (isWin) return arg.join(" "); // TODO: fix this. this is a hard problem though.

  // source: https://www.npmjs.com/package/shell-escape
  return arg
    .map(s => {
      if (/^[A-Za-z0-9_/-]+$/.test(s)) return s;
      return `'${s.replace(/'/g, "'\\''")}'` // replace single-quote with escaped single-quote and wrap in single-quotes
        .replace(/^(?:'')+/g, "") // unduplicate single-quote at the beginning
        .replace(/\\'''/g, "\\'"); // remove non-escaped single-quote if there are enclosed between 2 escaped
    })
    .join(" ");
}

/**
 * Opens a new terminal with the given command
 * @param {VercelManager} vercel
 * @param params the commands to pass to vercel. note: don't include -t
 * If a string is passed as params, it will be the only parameter passed
 */
export async function vercelCommand(
  vercel: VercelManager,
  params: string[] | string,
  opts?: TerminalOptions
): Promise<Terminal | undefined> {
  params = Array.isArray(params) ? params : [params];
  const auth = vercel.auth;
  if (!auth) {
    await window.showErrorMessage("Please set your authentication token");
    return;
  }
  const vercelPath = await which("vercel", { nothrow: true });
  if (!vercelPath) {
    const msg = `The vercel CLI is required for this feature.\nPlease install with npm install -g vercel`;
    await window.showErrorMessage(msg);
    return;
  }
  const cmd = [vercelPath, ...params, "-t", auth];
  const name = "Vercel " + params[0];
  return new Terminal(cmd, { name, ...opts }).show(true);
}
