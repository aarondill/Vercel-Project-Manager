import * as vscode from "vscode";
import { parseError } from "../utils/parseError";
import path from "path";
import { unlink } from "fs";
import { typeGuard } from "tsafe";
import { parseJsonObject } from "../utils/jsonParse";

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
  public async onDidLogIn() {
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

    const remove = async (_path: vscode.Uri) =>
      await this.setProject(undefined);

    this.fileWatcher.onDidChange(update);
    this.fileWatcher.onDidCreate(update);
    this.fileWatcher.onDidDelete(remove);
    this.folderWatcher.onDidDelete(remove);
    await update();
    this.onProjectStateChanged();
  }

  public onProjectStateChanged: (id?: string) => void;

  private readonly globalState: vscode.Memento;
  private readonly secrets: vscode.SecretStorage;
  constructor(
    { globalState, secrets }: vscode.ExtensionContext,
    {
      onAuthStateChanged,
      onProjectStateChanged,
    }: {
      onAuthStateChanged?: (state: boolean) => void;
      onProjectStateChanged?: (id?: string) => void;
    }
  ) {
    this.globalState = globalState;
    this.secrets = secrets;
    this.onAuthStateChanged = onAuthStateChanged ?? (x => x);
    this.onProjectStateChanged = onProjectStateChanged ?? (x => x);
    // initial run
    void this.getAuth().then(auth => {
      this.onAuthStateChanged(!!auth);
      this.onDidLogIn().catch(e =>
        vscode.window.showErrorMessage(
          `error while running DidLogIn handler: ${String(e)}`
        )
      );
    });
  }

  setAuth(token: string | undefined) {
    this.onAuthStateChanged(!!token);
    if (token === undefined) return this.secrets.delete(this.authKey);
    return this.secrets.store(this.authKey, token);
  }

  getAuth(): Thenable<string | undefined> {
    return this.secrets.get(this.authKey);
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
    await vscode.commands.executeCommand("setContext", "vercelLinked", !!token);
    return token;
  }

  getProject(): string | undefined {
    return this.globalState.get(this.projectKey);
  }
  private getProjectIdFromJson = async (
    uri?: vscode.Uri
  ): Promise<string | undefined> => {
    let fileUri = uri;
    if (!fileUri) {
      const currentFolder = vscode.workspace.workspaceFolders?.[0];
      if (!currentFolder) return;
      const wf = currentFolder.uri.path;
      const filePath = path.posix.join(wf, ".vercel", "project.json"); // posix join bc Uris}
      fileUri = vscode.Uri.file(filePath);
    }
    const vercelProjectJson = await vscode.workspace.fs.readFile(fileUri).then(
      x => x,
      () => null
    );
    if (!vercelProjectJson) return;
    const stringJson = Buffer.from(vercelProjectJson).toString("utf8");
    const parsed = parseJsonObject<{ projectId: string }>(stringJson);
    if (typeof parsed?.projectId === "string") return parsed.projectId;
  };
}
