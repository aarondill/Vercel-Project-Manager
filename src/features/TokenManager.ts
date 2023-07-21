import * as vscode from "vscode";
import { parseError } from "../utils/parseError";

export class TokenManager {
  private readonly authKey = "vercel_token";
  private readonly projectKey = "vercel_selected_project";

  private readonly onAuthStateChanged: (state: boolean) => void;
  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private folderWatcher: vscode.FileSystemWatcher | null = null;

  public onDidLogOut() {
    this.fileWatcher?.dispose();
    this.folderWatcher?.dispose();
    this.fileWatcher = null;
    this.folderWatcher = null;
  }
  public onDidLogIn() {
    /**
     * add file listener (@link https://code.visualstudio.com/api/references/vscode-api#workspace.createFileSystemWatcher )
     * call onLinkedStateChanged on change of .vercel/project.json file.
     */
    const ws = vscode.workspace.workspaceFolders?.[0];
    if (!ws) return;
    this.fileWatcher?.dispose();
    this.folderWatcher?.dispose();
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(ws, ".vercel/project.json"),
      false,
      false,
      false
    );
    this.folderWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(ws, ".vercel/"),
      true,
      true,
      false
    );
    const update = async (path?: vscode.Uri) =>
      await this.setProject(await this.getProjectIdFromJson(path));

    const remove = async (path: vscode.Uri) => await this.setProject(undefined);

    this.fileWatcher.onDidChange(update);
    this.fileWatcher.onDidCreate(update);
    this.fileWatcher.onDidDelete(remove);
    this.folderWatcher.onDidDelete(remove);
    update();
    this.onProjectStateChanged();
  }

  public onProjectStateChanged: (id?: string) => void;

  constructor(
    private readonly globalState: vscode.Memento,
    {
      onAuthStateChanged,
      onProjectStateChanged,
    }: {
      onAuthStateChanged: (state: boolean) => void;
      onProjectStateChanged?: (id?: string) => void;
    }
  ) {
    this.onAuthStateChanged = onAuthStateChanged;
    this.onProjectStateChanged = onProjectStateChanged ?? (x => x);
    // initial run
    this.onAuthStateChanged(!!globalState.get(this.authKey));
    if (this.getAuth()) this.onDidLogIn();
  }

  setAuth(token: string | undefined) {
    this.onAuthStateChanged(!!token);
    return this.globalState.update(this.authKey, token);
  }

  getAuth(): string | undefined {
    return this.globalState.get(this.authKey);
  }

  async setProject(token: string | undefined) {
    /* 
		Only call update functions if is actually updated. This is mostly to avoid calling on startup
		and forcing two requests to vercel if already in linked project directory
		*/
    if (token !== this.getProject()) {
      await this.globalState.update(this.projectKey, token);
      this.onProjectStateChanged(token);
    }
    vscode.commands.executeCommand("setContext", "vercelLinked", !!token);
    return token;
  }

  getProject(): string | undefined {
    return this.globalState.get(this.projectKey);
  }
  private getProjectIdFromJson = async (
    uri?: vscode.Uri
  ): Promise<string | undefined> => {
    if (!vscode.workspace.workspaceFolders?.[0]) {
      return undefined;
    }
    const wf = vscode.workspace.workspaceFolders[0].uri.path;
    const filePath = `${wf}/.vercel/project.json`;
    const fileUri: vscode.Uri = uri ?? vscode.Uri.file(filePath);
    let vercelProjectJson: Uint8Array | null = null;
    try {
      vercelProjectJson = await vscode.workspace.fs.readFile(fileUri);
    } catch {
      return undefined;
    }
    try {
      const stringJson: string =
        Buffer.from(vercelProjectJson).toString("utf8");
      const parsedVercelJSON: { projectId?: string } = JSON.parse(
        stringJson
      ) as {
        projectId?: string;
      };
      return parsedVercelJSON.projectId;
    } catch (error) {
      await vscode.window.showErrorMessage(parseError(error));
      return undefined;
    }
  };
}
