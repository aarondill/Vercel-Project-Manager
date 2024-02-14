import { window } from "vscode";
import type { Command } from "../../CommandManager";
import {
  vercelTargets,
  type VercelEnvironmentInformation,
} from "../../features/models";
import type { VercelManager } from "../../features/VercelManager";

export class SetEnvironment implements Command {
  public readonly id = "vercel.setEnvironment";
  constructor(private readonly vercel: VercelManager) {}
  private async getIdFromUser(envList: VercelEnvironmentInformation[]) {
    const key = await window.showQuickPick(
      envList.map(e => e.key).filter(Boolean) as string[],
      {
        placeHolder: "key",
        title: "Pick one to edit:",
      }
    );
    if (key) return { key, id: envList.find(e => e.key === key)?.id };
    return undefined;
  }

  dispose() {}
  async execute(command?: {
    id: string;
    key: string;
    editing: "TARGETS" | "VALUE";
  }) {
    if (!this.vercel.selectedProject) return;
    if (!(await this.vercel.loggedIn())) return;

    //> Get info from arguments if given
    let id: string | undefined = command?.id;
    let key: string | undefined = command?.key;

    //> Get list of current Environments
    const envList = await this.vercel.env.getEnvList();

    //> Request user input for id
    if (!id)
      ({ id, key } = (await this.getIdFromUser(envList)) ?? {
        id: undefined,
        key: undefined,
      });

    //> Ensure value to remove exists
    if (!id || !key) return;

    //> Find variable being changed
    const env = envList.find(env => env.id === id);
    if (!env)
      return void window.showErrorMessage("Could not find environment!");

    //> get user input for value(placeholder = original value)
    const currValue = env.value;
    const newValue =
      !command?.editing || command.editing === "VALUE"
        ? await window.showInputBox({
            value: currValue,
            prompt: "Input the new value",
            title: `Editing ${key}`,
          })
        : currValue;
    if (newValue === undefined) return;

    //> Get user options of targets to apply to
    /** list of initial targets */
    const initialTargets =
      typeof env.target === "string" ? [env.target] : env.target ?? [];

    let targets = initialTargets;
    /** Check if Arguments say only to edit values */
    if (!command?.editing || command.editing === "TARGETS") {
      /** List of options available for user choice */
      const options = vercelTargets.map(l => ({
        label: l,
        alwaysShow: true,
        picked: initialTargets.includes(l),
      }));

      /** User's choice of targets as a list of options*/
      const chosen = await window.showQuickPick(options, {
        canPickMany: true,
        placeHolder: "Select environments to apply to (esc to cancel)",
        title: `Editing ${key}`,
      });
      if (!chosen) return;
      /** List of choices as strings */
      targets = chosen?.map(t => t.label);
    }
    //> Return if canceled
    if (targets.length === 0) return;

    //> edit the env by **ID**, new value and targets
    await this.vercel.env.edit(id, newValue, targets);
  }
}
