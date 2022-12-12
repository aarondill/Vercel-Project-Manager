/* eslint-disable @typescript-eslint/naming-convention */
// 👆 because vercel API requires snake_case keys

import fetch from "node-fetch";
import urlcat from "urlcat";

import { vercelDeployementResponse } from "./models";
import { TokenManager } from "./TokenManager";

class Api {
	private static baseUrl = "https://api.vercel.com";
	private static base(path?: string, query?: Record<string, string>) {
		return urlcat(this.baseUrl, path ?? "", query ?? {});
	}
	public static deployments = Api.base("/v6/deployments");
}

export class VercelManager {
	public onDidLogOut: () => void = () => {};
	public onDidDeploymentsUpdated: () => void = () => {};

	public onDidProjectsUpdated: () => void = () => {};
	public onDidProjectSelected: () => void = () => {};

	public constructor(private readonly token: TokenManager) {
		setInterval(() => {
			this.onDidDeploymentsUpdated();
		}, 5 * 60 * 1000); // refresh every 5 mins
	}

	public async logIn(apiToken: string): Promise<boolean> {
		try {
			await this.token.setAuth(apiToken);
			this.onDidDeploymentsUpdated();
			this.onDidProjectsUpdated();
			return true;
		} catch (e) {
			return false;
		}
	}

	async logOut() {
		await this.token.setAuth(undefined);
		await this.token.setProject(undefined);

		this.onDidLogOut();
		this.onDidDeploymentsUpdated();
		this.onDidProjectsUpdated();
	}

	async getDeployments() {
		if (this.token.getAuth() && this.selectedProject) {
			const response = await fetch(
				urlcat(Api.deployments, {
					projectId: this.selectedProject,
					limit: 50,
				}),
				{
					headers: {
						Authorization: `Bearer ${this.token.getAuth()}`,
					},
					method: "get",
				}
			);
			const data = (await response.json()) as vercelDeployementResponse;
			return data;
		} else {
			return { deployments: [] };
		}
	}

	get selectedProject() {
		return this.token.getProject();
	}
}
