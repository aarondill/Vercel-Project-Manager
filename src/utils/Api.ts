import type { RequestInit } from "node-fetch";
import fetch from "node-fetch";
import type { ParamMap } from "urlcat";
import urlcat from "urlcat";
import { window } from "vscode";
import type { VercelResponse } from "../features/models";
import { typeGuard } from "tsafe";

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
  private static init<
    T extends Record<PropertyKey, unknown> | unknown[],
  >(initial: { path: string; params?: ParamMap; fetch?: RequestInit }) {
    const initOpt = initial.params ?? {};
    const initFetchOpt = initial.fetch ?? {};
    const path = initial.path;
    //> Returns a function for fetching
    return async (
      options?: ParamMap,
      fetchOptions?: RequestInit
    ): Promise<(T & { ok: true }) | (VercelResponse.error & { ok: false })> => {
      options ??= {};
      const finalOptions = { ...initOpt, ...options };
      const finalFetchOptions: RequestInit = this.mergeHeaders(
        initFetchOpt,
        fetchOptions
      );
      const url = this.base(path, finalOptions);
      const response = await fetch(url, finalFetchOptions).catch(
        e =>
          ({
            error: {
              code: "FetchError",
              message: `A Network Error Occured: ${e}`,
            },
          }) as const
      );
      if ("error" in response) return { ...response, ok: false };
      //> Check for error and tell user
      const invalidResponseError = {
        error: {
          code: "InvalidResponse",
          message: "Failed to parse response json",
        },
      };
      const data =
        (await response.json().then(
          r => r as T | VercelResponse.error,
          () => null
        )) ?? invalidResponseError;
      if (typeGuard<VercelResponse.error>(data, "error" in data)) {
        const msg = `Vercel Server Error: ${data?.error?.message ?? "unknown error"}`;
        void window.showErrorMessage(msg);
        return {
          ...data,
          ok: false,
        };
      }
      return {
        ...data,
        ok: true,
      };
    };
  }

  public static deployments = this.init<VercelResponse.deployment>({
    path: "/v6/deployments",
    fetch: {
      method: "GET",
    },
  });
  public static projectInfo = this.init<VercelResponse.info.project>({
    path: "/v9/projects/:projectId",
    fetch: {
      method: "GET",
    },
  });
  public static userInfo = this.init<VercelResponse.info.user>({
    path: "/v2/user",
    fetch: {
      method: "GET",
    },
  });
  public static environment = {
    getAll: this.init<VercelResponse.environment.getAll>({
      path: "/v8/projects/:projectId/env",
      params: { decrypt: "true" },
      fetch: {
        method: "GET",
      },
    }),
    remove: this.init<VercelResponse.environment.remove>({
      path: "/v9/projects/:projectId/env/:id",
      fetch: {
        method: "DELETE",
      },
    }),
    create: this.init<VercelResponse.environment.create>({
      path: "/v10/projects/:projectId/env",
      fetch: {
        method: "POST",
      },
    }),
    edit: this.init<VercelResponse.environment.edit>({
      path: "/v9/projects/:projectId/env/:id",
      fetch: {
        method: "PATCH",
      },
    }),
  };
  public static oauth = {
    /** Note: This requires a body with code, redirect_uri, client_id, and client_secret */
    accessToken: this.init<VercelResponse.oauth.accessToken>({
      path: "/v2/oauth/access_token",
      fetch: {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      },
    }),
  };
}
