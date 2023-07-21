import type { RequestInit, Response } from "node-fetch";
import fetch from "node-fetch";
import type { ParamMap } from "urlcat";
import urlcat from "urlcat";
import { window } from "vscode";
import type { VercelResponse } from "../features/models";

export class Api {
  /** Combines two objects, combining any object properties down one level
   * eg. {a: 1, b: { num: 2 }} and {c: 3, a: 4, b: { num2: 5 }}
   * {a: 4, b: {num: 2, num2: 5}, c: 3 }
   * Any non-object properties are overwritten if on a, or overwrite if on b.
   * Both arguments should be objects. if they are not objects, you will likely get an empty object back.
   */
  private static mergeHeaders(a: unknown, b?: unknown) {
    // eslint-disable-next-line eqeqeq
    if (b == undefined && typeof a === "object") return { ...a };
    else if (typeof b !== "object" || b === null) return {};
    else if (typeof a !== "object" || a === null) return {};

    const isObject = (obj: any) => !!obj && typeof obj === "object";
    const r: { [k: string]: unknown } = { ...a };
    for (const key of Object.keys(b)) {
      const aVal = (a as Record<typeof key, unknown>)[key];
      const bVal = (b as Record<typeof key, unknown>)[key];
      if (key in a) {
        if (Array.isArray(aVal)) r[key] = aVal.concat(bVal);
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
      options: ParamMap,
      fetchOptions?: RequestInit
    ): Promise<Response> => {
      const finalOptions = { ...initOpt, ...options };
      const finalFetchOptions: RequestInit = this.mergeHeaders(
        initFetchOpt,
        fetchOptions
      );
      const url = this.base(path, finalOptions);
      const response = await fetch(url, finalFetchOptions);

      //> Check for error and tell user
      const responseClone = response.clone();
      const data = (await responseClone.json()) as VercelResponse.error;
      if ("error" in data)
        await window.showErrorMessage(
          `Error: ${data?.error?.message ?? "unknown"}`
        );

      //> return original response
      return response;
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
