/* eslint-disable @typescript-eslint/naming-convention */
// 👆 because vercel API requires snake_case keys

import fetch, { RequestInit, Response } from "node-fetch";
import urlcat, { ParamMap } from "urlcat";
import * as vscode from "vscode";

import { parseError } from "../utils/parseError";
import {
	VercelAuthUser,
	VercelDeploymentResponse,
	VercelEnvironmentInformation,
	VercelEnvironnmentGetAllResponse,
	VercelProjectInformationResponse,
} from "./models";
import { TokenManager } from "./TokenManager";

class Api {
	private static mergeHeaders(
		a: { [k: string]: string | object | any[] },
		b?: { [k: string]: string | object | any[] }
	) {
		if (b === undefined) return { ...a };

		const isObject = (obj: any) => obj && typeof obj === "object";
		const r: { [k: string]: string | object } = { ...a };
		for (const key in b) {
			const aVal = a[key];
			const bVal = b[key];
			if (key in a) {
				if (Array.isArray(aVal)) r[key] = (aVal as any[]).concat(bVal);
				else if (isObject(aVal))
					r[key] = { ...(aVal as object), ...(bVal as object) };
				else r[key] = bVal;
			} else r[key] = bVal;
		}
		return r;
	}

	private static baseUrl = "https://api.vercel.com";
	private static base(path?: string, query?: ParamMap) {
		return urlcat(this.baseUrl, path ?? "", query ?? {});
	}
	private static init(initial: {
		path: string;
		params?: ParamMap;
		fetch?: RequestInit;
	}) {
		const initOpt = initial.params ?? {};
		const initFetchOpt = initial.fetch ?? {};
		const path = initial.path;
		//> Returns a function for fetching
		return async (
			userOpt: ParamMap,
			userFetchOpt?: RequestInit
		): Promise<Response> => {
			const opt = { ...initOpt, ...userOpt };
			const fetchOpt = this.mergeHeaders(
				initFetchOpt as {},
				userFetchOpt as {}
			);
			const url = this.base(path, opt);
			return fetch(url, fetchOpt);
		};
	}

	public static deployments = this.init({
		path: "/v6/deployments",
		fetch: {
			method: "GET",
		},
	});
	public static projectInfo = this.init({
		path: "/v9/projects/:projectId",
		fetch: {
			method: "GET",
		},
	});
	public static userInfo = this.init({
		path: "/v2/user",
		fetch: {
			method: "GET",
		},
	});
	public static environment = {
		getAll: this.init({
			path: "/v8/projects/:projectId/env",
			params: { decrypt: "true" },
			fetch: {
				method: "GET",
			},
		}),
		remove: this.init({
			path: "/v9/projects/:projectId/env/:id",
			fetch: {
				method: "DELETE",
			},
		}),
		create: this.init({
			path: "/v10/projects/:projectId/env",
			fetch: {
				method: "POST",
			},
		}),
		edit: this.init({
			path: "/v9/projects/:projectId/env/:id",
			fetch: {
				method: "PATCH",
			},
		}),
	};
}

export class VercelManager {
	public onDidEnvironmentsUpdated: () => void = () => {};
	public onDidLogOut: () => void = () => {};
	public onDidDeploymentsUpdated: () => void = () => {};

	public onDidProjectSelected: () => void = () => {};

	public constructor(private readonly token: TokenManager) {
		setInterval(() => {
			this.onDidDeploymentsUpdated();
			this.onDidEnvironmentsUpdated();
		}, 5 * 60 * 1000); // refresh every 5 mins
	}
	private projectInfo: VercelProjectInformationResponse | null = null;
	async getProjectInfo() {
		if (this.projectInfo !== null) return this.projectInfo;
		const response = await Api.projectInfo(
			{
				projectId: this.selectedProject,
			},
			this.authHeaders
		);
		const result = (await response.json()) as VercelProjectInformationResponse;
		this.projectInfo = result;
		return result;
	}
	private userInfo: VercelAuthUser | null = null;

	async getUserInfo() {
		if (this.userInfo !== null) return this.userInfo;
		const response = await Api.userInfo({}, this.authHeaders);
		const json = (await response.json()) as { user: VercelAuthUser };
		const result = json.user;
		this.userInfo = result;
		return result;
	}

	async logIn(apiToken: string): Promise<boolean> {
		await this.token.setAuth(apiToken);
		await this.token.setProject(await this.getProjectIdFromJson());
		this.onDidDeploymentsUpdated();
		this.onDidEnvironmentsUpdated();
		return false;
	}

	async logOut() {
		await this.token.setAuth(undefined);
		await this.token.setProject(undefined);

		this.onDidLogOut();
		this.onDidDeploymentsUpdated();
		this.onDidEnvironmentsUpdated();
	}

	async getDeployments() {
		if (this.auth && this.selectedProject) {
			const response = await Api.deployments(
				{
					projectId: this.selectedProject,
					limit: 50, //TODO create setting for this limit
				},
				this.authHeaders
			);
			const data = (await response.json()) as VercelDeploymentResponse;
			return data;
		} else {
			return { deployments: [] };
		}
	}

	async getEnvironment(): Promise<VercelEnvironmentInformation[] | undefined> {
		if (this.auth && this.selectedProject) {
			const response = await Api.environment.getAll(
				{
					projectId: this.selectedProject,
				},
				this.authHeaders
			);
			const data = (await response.json()) as VercelEnvironnmentGetAllResponse;
			if ("envs" in data) return data.envs;
			else return [data];
		} else {
			return undefined;
		}
	}
	private getProjectIdFromJson = async (): Promise<string | undefined> => {
		if (!vscode.workspace.workspaceFolders?.[0]) {
			return undefined;
		}
		const wf = vscode.workspace.workspaceFolders[0].uri.path;
		const filePath = `${wf}/.vercel/project.json`;
		const fileUri: vscode.Uri = vscode.Uri.file(filePath);
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

	get selectedProject() {
		return this.token.getProject();
	}
	get auth() {
		return this.token.getAuth();
	}
	private get authHeaders() {
		return { headers: { Authorization: `Bearer ${this.auth}` } };
	}
}
