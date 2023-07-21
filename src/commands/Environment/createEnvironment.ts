import { Blob } from "node-fetch";
import { window } from "vscode";
import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";

export class CreateEnvironment implements Command {
  public readonly id = "vercel.createEnvironment";
  constructor(private readonly vercel: VercelManager) {}
  async execute() {
    if (!(this.vercel.auth && this.vercel.selectedProject)) return;

    const envlist = (await this.vercel.env.getEnvList())!.map(x => x.key);
    //> Get key from user
    const key = await window.showInputBox({
      placeHolder: "Key for environment variable",
      validateInput: value =>
        (value.match(/[^a-zA-Z\d_]/) &&
          "Only letters, digits, and underscores are allowed.") ||
        (value.match(/^[^a-zA-Z]/) && "The name should start with a letter.") ||
        (envlist.includes(value) &&
          `${value} already exists. Use set environment to change it's value`) ||
        null,
      title: "Creating Environment Variable",
    });
    //> Empty keys are disallowed
    if (!key) return;

    //> Util function to get size of string in bytes
    const byteSize = (str: string) => new Blob([str]).size;

    //> Get value from user
    const value = await window.showInputBox({
      placeHolder: `Value for ${key}`,
      title: `Creating Environment Variable (${key})`,
      validateInput: value => {
        const bits = byteSize(value + key);
        if (bits >= 65535) {
          return (
            "The combined key and value size of your Environment Variable" +
            ` (${bits} bytes) exceeds the 65535 byte length limit. To set larger` +
            " Environment Variables, please use the Vercel dashboard"
          );
        }
      },
    });
    //> Empty values are allowed
    if (value === undefined) return;

    //> Get targets from user
    const options = [
      {
        label: "Development",
        alwaysShow: true,
        picked: true,
      },
      { label: "Preview", alwaysShow: true, picked: true },
      {
        label: "Production",
        alwaysShow: true,
        picked: true,
      },
    ];

    /** User's choice of targets as a list of options*/
    const targetsChoices = await window.showQuickPick(options, {
      canPickMany: true,
      placeHolder: "Select environments to apply to (None or esc to cancel)",
      title: `Creating ${key}`,
    });
    if (!targetsChoices || targetsChoices.length === 0) return;
    const targets = targetsChoices.map(x => x.label.toLowerCase());

    this.vercel.env.create(key, value, targets);
  }
}
