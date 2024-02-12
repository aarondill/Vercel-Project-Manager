import * as vscode from "vscode";
import type { VercelEnvironmentInformation } from "./models";
import type { VercelManager } from "./VercelManager";

class EnvironmentItem extends vscode.TreeItem {
  envId: string;
  key: string;
  contextValue = "Environment";
  constructor(public readonly data: VercelEnvironmentInformation) {
    super(data.key!, vscode.TreeItemCollapsibleState.Collapsed);
    this.iconPath = new vscode.ThemeIcon("key");
    this.tooltip = data.key;
    this.envId = data.id!;
    this.key = data.key!;
  }
}

class EnvironmentTarget extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("location");
  envId: string;
  key: string;
  constructor(element: EnvironmentItem) {
    const { target, id, key } = element.data;
    const display = Array.isArray(target)
      ? target.join(", ")
      : (target as string);
    super(display);
    this.tooltip = display;
    this.key = key!;
    this.envId = id!;
    this.command = {
      command: "vercel.setEnvironment",
      title: "Set An Environment Variable",
      arguments: [{ id: this.envId, key: this.key, editing: "TARGETS" }],
    };
  }
}

class EnvironmentValue extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("gear");
  envId: string;
  key: string;
  constructor(element: EnvironmentItem) {
    const { value, id, key } = element.data;
    super(value!);
    this.tooltip = value;
    this.envId = id!;
    this.key = key!;
    this.command = {
      command: "vercel.setEnvironment",
      title: "Set An Environment Variable",
      arguments: [{ id: this.envId, key: this.key, editing: "VALUE" }],
    };
  }
}

class CreateEnvironment extends vscode.TreeItem {
  iconPath = new vscode.ThemeIcon("plus");

  constructor() {
    const display = "Click to add an environment variable";
    super(display);
    this.tooltip = display;
    this.command = {
      command: "vercel.createEnvironment",
      title: "Add An Environment Variable",
      arguments: [],
    };
  }
}

export class EnvironmentProvider
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
    this.vercel.onDidEnvironmentsUpdated = () => this.refresh();
  }

  getTreeItem(element: EnvironmentItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: EnvironmentItem): Promise<vscode.TreeItem[]> {
    if (element) {
      const items = [
        new EnvironmentValue(element),
        new EnvironmentTarget(element),
      ];
      return items;
    }
    if (!this.vercel.selectedProject || !(await this.vercel.loggedIn()))
      return [];
    const items: vscode.TreeItem[] = [new CreateEnvironment()];
    const res = await this.vercel.env.getAll();
    if (res.length > 0) {
      res.forEach(x => {
        items.push(new EnvironmentItem(x));
      });
    }
    return items;
  }
}
