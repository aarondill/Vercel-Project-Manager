import type { StatusBarItem } from "vscode";
import { StatusBarAlignment, window } from "vscode";
import { relativeTimeFromDates } from "../utils/formatDates";
import type { VercelManager } from "./VercelManager";

export class StatusBar {
  private interval: NodeJS.Timer;

  private statusIcon: StatusBarItem = window.createStatusBarItem(
    StatusBarAlignment.Right,
    100
  );

  private icon = "$(debug-breakpoint-function-unverified)";
  private set text(str: string) {
    this.statusIcon.text = `${this.icon} ${str}`;
  }
  private set tooltip(str: string) {
    this.statusIcon.tooltip = str;
  }

  public dispose() {
    clearInterval(this.interval);
    this.statusIcon.dispose();
  }

  public constructor(private readonly vercel: VercelManager) {
    this.text = `Loading`;
    this.tooltip = "Loading Vercel deployment status...";
    this.statusIcon.show();
    this.statusIcon.command = "workbench.view.extension.vercel-sidebar";
    this.updateStatus().catch(err =>
      console.error(
        `something went wrong while updating the status bar: ${String(err)}`
      )
    );
    this.interval = setInterval(() => {
      this.updateStatus().catch(err =>
        console.error(
          `something went wrong while updating the status bar: ${String(err)}`
        )
      );
    }, 10 * 1000); //refresh every 10 secs
  }

  public async updateStatus(): Promise<void> {
    if (!this.vercel.auth) {
      this.text = "Login";
      this.tooltip = "Click to login";
      return;
    }
    if (!this.vercel.selectedProject) {
      this.text = "Link Vercel";
      this.tooltip = "Click to link to Vercel";
      return;
    }

    const deploys = await this.vercel.getDeploymentsList();

    if (deploys.length === 0) {
      this.text = "Not found";
      this.tooltip = "No deployments were found";
      return;
    }

    const { state, name, createdAt, source } = deploys[0];

    const formattedDate = createdAt
      ? relativeTimeFromDates(new Date(createdAt))
      : "a while";

    const capitalFirst = (str: string) =>
      str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    this.text = capitalFirst(state ?? "Unknown");

    this.tooltip = `${name ?? "unknown repo"} (${(
      state ?? "unknown"
    ).toLowerCase()}) ${formattedDate} ago via ${source ?? "unknown source"}`;
  }
}
