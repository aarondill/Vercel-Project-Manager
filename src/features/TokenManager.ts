import * as vscode from "vscode";
import path from "path";
import { parseJsonObject } from "../utils/jsonParse";
import type { OauthResult } from "../utils/oauth";

export class TokenManager {
  private readonly authKey = "vercel_token";
  private readonly teamIdKey = "vercel_team_id";
  private readonly projectKey = "vercel_selected_project";

  private fileWatcher: vscode.FileSystemWatcher | null = null;
  private folderWatcher: vscode.FileSystemWatcher | null = null;

  private readonly onAuthStateChanged = (state: boolean) =>
    vscode.commands.executeCommand("setContext", "vercelLoggedIn", state);

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
  public onProjectStateChanged: (id?: string) => void = x => x;
  private readonly globalState: vscode.Memento;
  private readonly secrets: vscode.SecretStorage;
  constructor({ globalState, secrets }: vscode.ExtensionContext) {
    this.globalState = globalState;
    this.secrets = secrets;
    // initial run
    void this.getAuth().then(auth => {
      void this.onAuthStateChanged(!!auth);
      this.onDidLogIn().catch(e =>
        vscode.window.showErrorMessage(
          `error while running DidLogIn handler: ${String(e)}`
        )
      );
    });
  }

  async setAuth(token: OauthResult | undefined) {
    const { accessToken, teamId } = token ?? {};
    if (accessToken) await this.secrets.store(this.authKey, accessToken);
    else await this.secrets.delete(this.authKey);

    if (teamId) await this.secrets.store(this.teamIdKey, teamId);
    else await this.secrets.delete(this.teamIdKey);

    await this.onAuthStateChanged(!!token);
  }

  async getAuth(): Promise<OauthResult | undefined> {
    const accessToken = await this.secrets.get(this.authKey);
    if (!accessToken) return; // We will never have a (valid) teamid without a token!
    const teamId = (await this.secrets.get(this.teamIdKey)) ?? null;
    return { accessToken, teamId };
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
