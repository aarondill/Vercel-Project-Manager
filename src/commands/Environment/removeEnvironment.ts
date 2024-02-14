import type { QuickPickItem } from "vscode";
import { window } from "vscode";
import type { Command } from "../../CommandManager";
import type { VercelManager } from "../../features/VercelManager";

/** Returns true if the user confirms the deletion */
async function confirm(key: string) {
  const warning = `Are you sure you want to delete the environment variable ${key}? This is not reversable.`;
  // Typescript got very confused here, even though it's perfectly valid.
  // @ts-expect-error It doesn't believe a string array is permitted, but in reality, it is.
  const confirm = (await window.showQuickPick(["No", "Yes"], {
    title: warning,
    placeholder: warning,
    canPickMany: false,
  })) as string;
  return confirm === "Yes";
}
export class RemoveEnvironment implements Command {
  public readonly id = "vercel.removeEnvironment";
  constructor(private readonly vercel: VercelManager) {}
  dispose() {}
  async execute(command?: { envId: string; key: string }) {
    if (!this.vercel.selectedProject) return;
    //> Get information from arguments if given
    let id: string | undefined = command?.envId;
    let key: string | undefined = command?.key;

    //> Else request user input
    if (!id) {
      /** Current Environment Variables */
      const envs = await this.vercel.env.getEnvList();
      /** Utility to allow using showQuickPick without loss of information */
      interface Options extends QuickPickItem {
        id: string;
      }
      /** Options to give to user */
      const options: Options[] = envs.map(e => ({
        label: e.key!,
        id: e.id!,
      }));
      /** THe user's choice or undefined */
      const choice = await window.showQuickPick(options, {
        placeHolder: "Pick one to delete or cancel with escape",
        title: "Delete Environment Variable",
        canPickMany: false,
      });
      /** Set key and id if the user made a choice */
      if (choice) ({ label: key, id } = choice);
    }

    // Ensure value to remove exists
    if (!id) return;

    // Confirm with user
    const confirmation = await confirm(key!);
    if (!confirmation) return;

    // Remove the env by **ID**
    await this.vercel.env.remove(id);
  }
}
