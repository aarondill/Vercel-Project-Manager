import * as vscode from "vscode";

import { getCommit } from "../utils/createCommit";
import { formatDate } from "../utils/formatDates";
import type { Commit } from "./Commit";
import type { VercelManager } from "./VercelManager";
import type { Deployment } from "./models";

class DeploymentItem extends vscode.TreeItem {
  constructor(
    public readonly data: Deployment,
    public readonly commit?: Commit
  ) {
    const formattedDate = formatDate(new Date(data.created));
    const target = data.target ?? "preview"; // is this always preview?
    const text: (string | undefined)[] = [commit?.branch, formattedDate];
    const desc = `${target}: ${text.filter(Boolean).join(" - ")}`;
    super(desc, vscode.TreeItemCollapsibleState.Collapsed);
    // Set tooltip to commit message, if applicable, else to "Deployed by ${source}"
    this.tooltip = commit
      ? commit.message
      : data.source
        ? `Deployed by ${data.source}`
        : undefined;

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
    if (!element) {
      const res = await this.vercel.deployments.getAll();
      return res.map(x => {
        const commit = x.source === "git" ? getCommit(x.meta) : undefined;
        return new DeploymentItem(x, commit);
      });
    }
    const items = [
      new DeploymentOpenUrlItem(element.data.url),
      new DeploymentViewLogItem(element.data.url, element.data.state!),
    ];
    if (element.commit) {
      items.push(
        new DeploymentBranchItem(element.commit),
        new DeploymentCommitItem(element.commit)
      );
    }
    return items;
  }
}
