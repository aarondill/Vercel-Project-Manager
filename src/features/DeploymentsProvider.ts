import * as timeago from "timeago.js";
import enShort from "timeago.js/lib/lang/en_short";
import * as vscode from "vscode";

import { getCommit } from "../utils/createCommit";
import { formatDate } from "../utils/formatDates";
import type { Commit } from "./Commit";
import type { Deployment } from "./models";
import type { VercelManager } from "./VercelManager";

timeago.register("en_SHORT", enShort);

class DeploymentItem extends vscode.TreeItem {
  constructor(public readonly data: Deployment) {
    const d = new Date(data.created);
    const formatted = formatDate(d);
    super(formatted, vscode.TreeItemCollapsibleState.Collapsed);
    // Set tooltip to commit message, if  applicable, else to "Deployed by ${source}"
    if (
      data.source === "git" &&
      data.meta &&
      Object.keys(data.meta).length !== 0
    ) {
      const commit = getCommit(data.meta);
      if (commit !== null) {
        this.tooltip = commit.message;
      }
    }
    if (this.tooltip === undefined && data.source) {
      this.tooltip = "Deployed by " + data.source;
    }
    switch (data.state) {
      case "READY":
        this.iconPath = new vscode.ThemeIcon(
          "symbol-event",
          new vscode.ThemeColor("charts.green")
        );
        break;
      case "ERROR":
        this.iconPath = new vscode.ThemeIcon(
          "circle-filled",
          new vscode.ThemeColor("charts.red")
        );
        break;
      case "CANCELED":
        this.iconPath = new vscode.ThemeIcon(
          "circle-filled",
          new vscode.ThemeColor("charts.gray")
        );
        break;
      case "INITIALIZING":
      case "BUILDING":
        this.iconPath = new vscode.ThemeIcon(
          "circle-filled",
          new vscode.ThemeColor("charts.yellow")
        );
        break;
      case "QUEUED":
        this.iconPath = new vscode.ThemeIcon("circle-outline");
        break;
      case undefined:
        this.iconPath = undefined;
        break;
    }
  }
}

class DeploymentOpenUrlItem extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("link");
  contextValue = "deployment";
  url: string;

  constructor(url: string) {
    super("Open URL");
    this.tooltip = url;
    this.url = "https://" + url;
    this.command = {
      command: "vscode.open",
      title: "Open Deployed Site",
      arguments: [vscode.Uri.parse(this.url)],
    };
  }
}

class DeploymentViewLogItem extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("pulse");
  contextValue = "deploymentLog";
  url: string;

  constructor(url: string, state: string) {
    super("View Logs");
    this.description = state.toLowerCase();
    this.url = "https://" + url + "/_logs#L1";
    this.command = {
      command: "vscode.open",
      title: "Open Vercel Logs",
      arguments: [vscode.Uri.parse(this.url)],
    };
  }
}

class DeploymentBranchItem extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("git-branch");
  contextValue = "deployment";
  url: string;

  constructor(commit: Commit) {
    super(commit.branch);
    this.description = `${commit.org}/${commit.repo}`;
    this.url = commit.branchUrl;
    this.command = {
      command: "vscode.open",
      title: "Open Git Branch",
      arguments: [vscode.Uri.parse(commit.branchUrl)],
    };
  }
}

class DeploymentCommitItem extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("git-commit");
  contextValue = "deployment";
  url: string;

  constructor(commit: Commit) {
    super(commit.message);
    this.description = commit.author;
    this.url = commit.url;
    this.command = {
      command: "vscode.open",
      title: "Open Git Commit",
      arguments: [vscode.Uri.parse(commit.url)],
    };
  }
}

export class DeploymentsProvider
  implements vscode.TreeDataProvider<vscode.TreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<undefined> =
    new vscode.EventEmitter();

  readonly onDidChangeTreeData: vscode.Event<undefined> =
    this._onDidChangeTreeData.event;

  private refresh() {
    this._onDidChangeTreeData.fire(undefined);
  }

  constructor(private readonly vercel: VercelManager) {
    this.vercel.onDidDeploymentsUpdated = () => this.refresh();
  }

  getTreeItem(element: DeploymentItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DeploymentItem): Promise<vscode.TreeItem[]> {
    if (element) {
      const items = [
        new DeploymentOpenUrlItem(element.data.url),
        new DeploymentViewLogItem(element.data.url, element.data.state!),
      ];
      if (element.data.meta && Object.keys(element.data.meta).length !== 0) {
        const commit = getCommit(element.data.meta);

        if (commit !== null) {
          items.push(
            ...[
              new DeploymentBranchItem(commit),
              new DeploymentCommitItem(commit),
            ]
          );
        }
      }
      return items;
    }
    const res = (await this.vercel.deployments.getAll()) ?? [];
    return res.map(x => new DeploymentItem(x));
  }
}
