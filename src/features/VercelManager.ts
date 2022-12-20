/* eslint-disable @typescript-eslint/naming-convention */
// 👆 because vercel API requires snake_case keys
import { workspace } from "vscode";
import { Api } from "../utils/Api";
import {
	Deployment,
	VercelEnvironmentInformation,
	VercelResponse,
} from "./models";
import { TokenManager } from "./TokenManager";

export class VercelManager {
	public onDidEnvironmentsUpdated: () => void = () => {};
	public onDidLogOut: () => void = () => {};
	public onDidDeploymentsUpdated: () => void = () => {};

	public onDidProjectSelected: () => void = () => {};

	private projectInfo: VercelResponse.info.project | null = null;
	private userInfo: VercelResponse.info.user | null = null;

	public constructor(private readonly token: TokenManager) {
		const refreshRate = workspace
			.getConfiguration("vercel")
			.get("RefreshRate") as number;
		setInterval(() => {
			this.onDidDeploymentsUpdated();
			this.onDidEnvironmentsUpdated();
		}, (refreshRate ?? 5) * 60 * 1000); // refresh every refreshRate mins

		//retains this value of vercel
		token.onProjectStateChanged = (id?: string) => {
			this.onDidDeploymentsUpdated();
			this.onDidEnvironmentsUpdated();
			// force refresh of info on next call.
			this.projectInfo = null;
			this.userInfo = null;
		};
	}

	async logIn(apiToken: string): Promise<void> {
		await this.token.setAuth(apiToken);
		this.onDidDeploymentsUpdated();
		this.onDidEnvironmentsUpdated();
		this.token.onDidLogIn();
	}

	/**
	 * Un-sets authentication and project and calls didLogOut, didDeploymentsUpdated, and didEnvironmentsUpdates;
	 */
	async logOut() {
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
	/** Utility getter to return authentication token */
	get auth() {
		return this.token.getAuth();
	}
	/** Utility getter to return the proper fetch options for authentication  */
	private get authHeader() {
		return { headers: { Authorization: `Bearer ${this.auth}` } };
	}

	project = {
		getInfo: async (refresh: boolean = false) => {
			if (this.projectInfo !== null && !refresh) return this.projectInfo;
			const response = await Api.projectInfo(
				{
					projectId: this.selectedProject,
				},
				this.authHeader
			);
			const result = (await response.json()) as VercelResponse.info.project;
			this.projectInfo = result;
			return result;
		},
	};
	user = {
		getInfo: async (refresh: boolean = false) => {
			if (this.userInfo !== null && !refresh) return this.userInfo;
			const response = await Api.userInfo({}, this.authHeader);
			const json = (await response.json()) as {
				user: VercelResponse.info.user;
			};
			const result = json.user;
			this.userInfo = result;
			return result;
		},
	};
	private envList: VercelEnvironmentInformation[] | null = null;
	env = {
		/**
		 * @returns an array of environment variables for the current project from vercel,
		 * or undefined if no project is selected or no user is authenticated
		 */
		getAll: async (): Promise<VercelEnvironmentInformation[]> => {
			if (this.auth && this.selectedProject) {
				const response = await Api.environment.getAll(
					{
						projectId: this.selectedProject,
					},
					this.authHeader
				);
				const data =
					(await response.json()) as VercelResponse.environment.getAll;
				let r = undefined;
				if ("envs" in data) r = data.envs;
				else r = [data];
				this.envList = r;
				return r;
			} else {
				return [];
			}
		},
		/** returns the environment variable list, updating it if null */
		getEnvList: async () => {
			return this.envList ?? this.env.getAll();
		},
		/**
		 *
		 * @param key Name of var to create
		 * @param value Value to store in variable
		 * @param {("development" | "preview" | "production")[]} targets Deployment targets to set to
		 */
		create: async (key: string, value: string, targets: string[]) => {
			await Api.environment.create(
				{
					projectId: this.selectedProject,
				},
				{
					headers: this.authHeader.headers,
					body: JSON.stringify({
						key,
						value,
						target: targets,
						type: "encrypted",
					}),
				}
			);
			this.onDidEnvironmentsUpdated();
		},

		/**
		 * Deletes an environment variable based on ID
		 * @param id A string corresponding to the Vercel ID of the env variable
		 */
		remove: async (id: string) => {
			await Api.environment.remove(
				{
					projectId: this.selectedProject,
					id,
				},
				this.authHeader
			);
			this.onDidEnvironmentsUpdated();
		},
		/**
		 *
		 * @param id A string corresponding the ID of the Environment Variable
		 * @param value The value to set the Variable to
		 * @param {("development" | "preview" | "production")[]} targets Deployment targets to set to
		 */
		edit: async (id: string, value: string, targets: string[]) => {
			await Api.environment.edit(
				{
					projectId: this.selectedProject,
					id,
				},
				{
					headers: this.authHeader.headers,

					body: JSON.stringify({
						value,
						target: targets,
					}),
				}
			);
			this.onDidEnvironmentsUpdated();
		},
	};
	private deploymentsList: Deployment[] | null = null;
	/** returns the environment variable list, updating it if null */
	async getDeploymentsList() {
		while (this.fetchingDeployments); //If fetching, wait until done.
		return this.deploymentsList ?? this.deployments.getAll();
	}
	private fetchingDeployments = false;
	deployments = {
		/**
		 * @returns A list of deployments for the currently selected project and
		 * user or empty list if either doesn't exist
		 */
		getAll: async () => {
			if (this.auth && this.selectedProject) {
				try {
					this.fetchingDeployments = true;
					const limit = workspace
						.getConfiguration("vercel")
						.get("DeploymentCount") as number;
					const response = await Api.deployments(
						{
							projectId: this.selectedProject,
							limit: limit ?? 20,
						},
						this.authHeader
					);
					const data = (await response.json()) as VercelResponse.deployment;
					const r = data.deployments;
					this.deploymentsList = r;
					return r;
				} finally {
					this.fetchingDeployments = false;
				}
			} else {
				return [];
			}
		},
	};
}
