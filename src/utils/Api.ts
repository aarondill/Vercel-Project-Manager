import fetch, { RequestInit, Response } from "node-fetch";
import urlcat, { ParamMap } from "urlcat";

export class Api {
	/** Combines two objects, combining any object properties down one level
	 * eg. {a: 1, b: { num: 2 }} and {c: 3, a: 4, b: { num2: 5 }}
	 * {a: 4, b: {num: 2, num2: 5}, c: 3 }
	 * Any non-object properties are overwritten if on a, or overwrite if on b.
	 */
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
	/**
	 * Sets up a function for fetching to the api at *initial* with the default options of *params* and *fetch*
	 * @param initial Initial configuration for the API call
	 * @returns A function that performs a fetch with the options requested
	 */
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
