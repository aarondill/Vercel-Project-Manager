/* eslint-disable @typescript-eslint/naming-convention */
// 👆 because vercel API requires snake_case keys
import { window, workspace } from "vscode";
import { Api } from "../utils/Api";
import { getTokenOauth } from "../utils/oauth";
import type { TokenManager } from "./TokenManager";
import type {
  Deployment,
  VercelEnvironmentInformation,
  VercelResponse,
  VercelTargets,
} from "./models";

export class VercelManager {
  public onDidEnvironmentsUpdated: () => void = () => {};
  public onDidLogOut: () => void = () => {};
  public onDidDeploymentsUpdated: () => void = () => {};

  public onDidProjectSelected: () => void = () => {};

  private projectInfo: VercelResponse.info.project | null = null;
  private userInfo: VercelResponse.info.User | null = null;
  private api: Api;

  public constructor(private readonly token: TokenManager) {
    this.api = new Api(token);
    const refreshRate = Number(
      workspace.getConfiguration("vercel").get("RefreshRate")
    );
    setInterval(
      () => {
        this.onDidDeploymentsUpdated();
        this.onDidEnvironmentsUpdated();
      },
      (refreshRate ?? 5) * 60 * 1000
    ); // refresh every refreshRate mins

    //retains this value of vercel
    token.onProjectStateChanged = (_id?: string) => {
      this.onDidDeploymentsUpdated();
      this.onDidEnvironmentsUpdated();
      // force refresh of info on next call.
      this.projectInfo = null;
      this.userInfo = null;
    };
  }
  loggedIn = async () => !!(await this.token.getAuth())?.accessToken;
  teamId = async () => (await this.token.getAuth())?.teamId;
  async debug(): Promise<Record<string, unknown>> {
    const ident = (x: unknown) => x;
    const orErr = <T>(p: Thenable<T>) => p.then(ident, ident);

    return {
      "Logged in": await orErr(this.loggedIn()),
      "Environment list": await orErr(this.env.getEnvList(true)),
      "Project information": await orErr(this.project.getInfo(true)),
      "User vercel information": await orErr(this.user.getInfo(true)),
      "Selected project id": this.selectedProject,
      Authentication: await orErr(this.token.getAuth()),
    };
  }

  async logIn(): Promise<boolean> {
    const apiToken = await getTokenOauth(this.api);
    if (!apiToken) return false;
    await this.token.setAuth(apiToken);
    this.onDidDeploymentsUpdated();
    this.onDidEnvironmentsUpdated();
    await this.token.onDidLogIn();
    return true;
  }

  /**
   * Un-sets authentication and project and calls didLogOut, didDeploymentsUpdated, and didEnvironmentsUpdates;
   */
  async logOut() {
    await this.api.deleteAccessToken({ tokenId: "current" }, undefined);
    await this.token.setAuth(undefined);
    await this.token.setProject(undefined);
    this.onDidLogOut();
    this.token.onDidLogOut();
    this.onDidDeploymentsUpdated();
    this.onDidEnvironmentsUpdated();
  }

  /** Utility getter to return project id */
  get selectedProject() {
    return this.token.getProject();
  }

  project = {
    getInfo: async (refresh: boolean = false) => {
      if (this.projectInfo !== null && !refresh) return this.projectInfo;
      const selectedProject = this.selectedProject;
      if (!selectedProject)
        return void window.showErrorMessage("No project selected!");
      const result = await this.api.projectInfo(
        { projectId: selectedProject },
        {}
      );
      if (!result.ok) return;
      return (this.projectInfo = result);
    },
  };
  user = {
    getInfo: async (refresh: boolean = false) => {
      if (this.userInfo !== null && !refresh) return this.userInfo;
      const response = await this.api.userInfo(undefined, undefined);
      if (!response.ok) return;
      return (this.userInfo = response.user);
    },
  };
  private envList: VercelEnvironmentInformation[] | null = null;
  env = {
    /**
     * @returns an array of environment variables for the current project from vercel,
     * or undefined if no project is selected or no user is authenticated
     */
    getAll: async (): Promise<VercelEnvironmentInformation[]> => {
      if (!this.selectedProject) return [];
      const response = await this.api.environment.getAll(
        { projectId: this.selectedProject },
        undefined
      );
      if (!response.ok) return (this.envList = []);
      const r = "envs" in response ? response.envs ?? [] : [response];
      return (this.envList = r);
    },
    /** returns the environment variable list, updating it if null */
    getEnvList: async (refresh: boolean = false) => {
      if (refresh || !this.envList) return await this.env.getAll();
      return this.envList;
    },
    /**
     *
     * @param key Name of var to create
     * @param value Value to store in variable
     * @param target Deployment targets to set to
     */
    create: async (key: string, value: string, target: VercelTargets[]) => {
      const projectId = this.selectedProject;
      if (!projectId)
        return void window.showErrorMessage("No project selected!");
      await this.api.environment.create(
        { projectId, body: { key, value, target, type: "encrypted" } },
        undefined
      );
      this.onDidEnvironmentsUpdated();
    },

    /**
     * Deletes an environment variable based on ID
     * @param id A string corresponding to the Vercel ID of the env variable
     */
    remove: async (id: string) => {
      const projectId = this.selectedProject;
      if (!projectId)
        return void window.showErrorMessage("No project selected!");
      await this.api.environment.remove({ projectId, id }, undefined);
      this.onDidEnvironmentsUpdated();
    },
    /**
     *
     * @param id A string corresponding the ID of the Environment Variable
     * @param value The value to set the Variable to
     * @param targets Deployment targets to set to
     */
    edit: async (id: string, value: string, targets: VercelTargets[]) => {
      const selectedProject = this.selectedProject;
      if (!selectedProject)
        return void window.showErrorMessage("No project selected!");
      await this.api.environment.edit(
        { projectId: selectedProject, id, body: { value, target: targets } },
        undefined
      );
      this.onDidEnvironmentsUpdated();
    },
  };
  private deploymentsList: Deployment[] | null = null;
  /** returns the environment variable list, updating it if null */
  async getDeploymentsList() {
    return await (this.deploymentsList ?? this.deployments.getAll());
  }
  private fetchingDeployments: Promise<Deployment[]> | null = null;
  deployments = {
    /**
     * @returns A list of deployments for the currently selected project and
     * user or empty list if either doesn't exist
     */
    getAll: async () => {
      const selectedProject = this.selectedProject;
      if (!selectedProject) return [];
      if (this.fetchingDeployments) return await this.fetchingDeployments; // ensure only one is fetching at a time
      const limit = workspace
        .getConfiguration("vercel")
        .get("DeploymentCount") as number;
      this.fetchingDeployments = new Promise(async res => {
        const data = await this.api.deployments(
          { projectId: selectedProject, limit: limit ?? 20 },
          undefined
        );
        this.deploymentsList = (data.ok && data.deployments) || [];
        return res(this.deploymentsList);
      });
      const res = await this.fetchingDeployments;
      this.fetchingDeployments = null;
      return res;
    },
  };
}
