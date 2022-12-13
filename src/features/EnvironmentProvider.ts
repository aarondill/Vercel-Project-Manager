import * as vscode from "vscode";
import { VercelEnvironmentInformation } from "./models";
import { VercelManager } from "./VercelManager";

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

	async getChildren(
		element?: EnvironmentItem
	): Promise<Array<vscode.TreeItem>> {
		if (element) {
			const items = [
				new EnvironmentValue(element),
				new EnvironmentTarget(element),
			];
			return items;
		} else {
			const items: vscode.TreeItem[] = [new CreateEnvironment()];
			const res = await this.vercel.getEnvironment();
			if (res) {
				res.forEach(x => {
					items.push(new EnvironmentItem(x));
				});
			}
			return items;
		}
	}
}
class EnvironmentItem extends vscode.TreeItem {
	envId: string;
	contextValue = "Environment";
	constructor(public readonly data: VercelEnvironmentInformation) {
		super(data.key!, vscode.TreeItemCollapsibleState.Collapsed);
		this.iconPath = new vscode.ThemeIcon("key");
		this.tooltip = data.key;
		this.envId = data.id!;
	}
}

class EnvironmentTarget extends vscode.TreeItem {
	iconPath = new vscode.ThemeIcon("location");
	envId: string;

	constructor(element: EnvironmentItem) {
		const { target, id } = element.data;
		const display = Array.isArray(target)
			? target.join(", ")
			: (target as string);
		super(display);
		this.tooltip = display;
		this.envId = id!;
		this.command = {
			command: "vercel.setEnvironment",
			title: "Set An Environment Variable",
			arguments: [this.envId],
		};
	}
}

class EnvironmentValue extends vscode.TreeItem {
	iconPath = new vscode.ThemeIcon("gear");
	envId: string;

	constructor(element: EnvironmentItem) {
		const { value, id } = element.data;
		super(value!);
		this.tooltip = value;
		this.envId = id!;
		this.command = {
			command: "vercel.setEnvironment",
			title: "Set An Environment Variable",
			arguments: [this.envId],
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
