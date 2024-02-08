import { window } from "vscode";
import type { Command } from "../../CommandManager";
import type { VercelEnvironmentInformation } from "../../features/models";
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

  async execute(command?: {
    id: string;
    key: string;
    editing: "TARGETS" | "VALUE";
  }) {
    if (!((await this.vercel.auth) && this.vercel.selectedProject)) return;

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
    const env = envList.find(
      env => env.id === id
    ) as VercelEnvironmentInformation;

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
    const initialTargets: string[] =
      typeof env.target === "string" ? [env.target] : env.target!;

    let targets: string[] | undefined;
    /** Check if Arguments say only to edit values */
    if (!command?.editing || command.editing === "TARGETS") {
      /** Function to check if the original contained the target */
      const getPicked = (target: string) => initialTargets?.includes(target);

      /** List of options available for user choice */
      const options = [
        {
          label: "Development",
          alwaysShow: true,
          picked: getPicked("development"),
        },
        { label: "Preview", alwaysShow: true, picked: getPicked("preview") },
        {
          label: "Production",
          alwaysShow: true,
          picked: getPicked("production"),
        },
      ];

      /** User's choice of targets as a list of options*/
      const chosen = await window.showQuickPick(options, {
        canPickMany: true,
        placeHolder: "Select environments to apply to (None or esc to cancel)",
        title: `Editing ${key}`,
      });
      /** List of choices as strings */
      targets = chosen?.map(t => t.label);
    } else {
      /** Editing Values Through Arguments */
      targets = initialTargets;
    }
    //> Return if canceled
    if (targets === undefined || targets === null || targets.length === 0)
      return;

    //> edit the env by **ID**, new value and targets
    await this.vercel.env.edit(
      id,
      newValue,
      targets.map(t => t.toLowerCase())
    );
  }
}
