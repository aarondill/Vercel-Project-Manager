import * as timeago from "timeago.js";
import type { StatusBarItem } from "vscode";
import { StatusBarAlignment, window } from "vscode";
import { error } from "../logging";
import type { VercelManager } from "./VercelManager";

const capitalFirst = (str: string) =>
  str.charAt(0).toUpperCase().concat(str.slice(1).toLowerCase());

export class StatusBar {
  private interval: NodeJS.Timeout;

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
    const upd = () =>
      this.updateStatus().catch(err => error(`updating status bar:`, err));
    this.text = `Loading`;
    this.tooltip = "Loading Vercel deployment status...";
    this.statusIcon.command = "workbench.view.extension.vercel-sidebar";
    void upd();
    this.statusIcon.show();
    this.interval = setInterval(upd, 10 * 1000); //refresh every 10 secs
  }

  private contents(text: string, tooltip: string): void {
    this.text = text;
    this.tooltip = tooltip;
  }

  public async updateStatus(): Promise<void> {
    if (!(await this.vercel.loggedIn()))
      return this.contents("Login", "Click to login");

    if (!this.vercel.selectedProject)
      return this.contents("Link Vercel", "Click to link to Vercel");

    const deploys = await this.vercel.getDeploymentsList();

    if (deploys.length === 0)
      return this.contents("Not found", "No deployments were found");

    const { state, name, createdAt, source } = deploys[0];

    const timeAgo = createdAt ? timeago.format(new Date(createdAt)) : "a while";

    const lowerState = (state ?? "unknown").toLowerCase();
    const tooltip = `${name ?? "unknown repo"} (${lowerState}) ${timeAgo} via ${source ?? "unknown source"}`;
    return this.contents(capitalFirst(lowerState), tooltip);
  }
}
