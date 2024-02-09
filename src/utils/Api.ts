/* eslint-disable @typescript-eslint/naming-convention */
import type { RequestInit } from "node-fetch";
import fetch from "node-fetch";
import type { ParamMap } from "urlcat";
import urlcat from "urlcat";
import { window } from "vscode";
import type {
  VercelEnvironmentInformation,
  VercelResponse,
  VercelTargets,
} from "../features/models";
import { objectKeys, typeGuard } from "tsafe";

/** The default TRet */
type TRetType = Record<PropertyKey, unknown> | unknown[];
/** The default TRequired */
type TRequiredType = ParamMap | undefined;
/** The default TRequiredFetch */
type TRequiredFetchType = RequestInit | undefined;
type AuthHeaders = { headers: { Authorization: string } };
type RequestHook<TRequired, TRequiredFetch> = <
  Params extends ParamMap & TRequired,
  Req extends RequestInit & TRequiredFetch,
>(opts: {
  params: Params;
  req: Req;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
}) => { params: ParamMap; req: RequestInit } | undefined | null | void;

export class Api {
  /** Combines two objects, combining any object properties down one level
   * eg. {a: 1, b: { num: 2 }} and {c: 3, a: 4, b: { num2: 5 }}
   * {a: 4, b: {num: 2, num2: 5}, c: 3 }
   * Any non-object properties are overwritten if on a, or overwrite if on b.
   * Both arguments should be objects. if they are not objects, you will likely get an empty object back.
   */
  private static mergeHeaders<A extends object>(a: A, b?: undefined): A;
  private static mergeHeaders<A extends object, B extends object>(
    a: A,
    b: B
  ): A & B; // This isn't *quite* correct, but it works for now.
  private static mergeHeaders<A extends object, B extends object | undefined>(
    a: A,
    b?: B
  ): A & B;
  private static mergeHeaders<A extends object, B extends object | undefined>(
    a: A,
    b?: B
  ) {
    if (!b) return { ...a };

    const isObject = (obj: any) => !!obj && typeof obj === "object";
    // The types required for the index is nearly impossible to figure out.
    const r = { ...a } as Record<string, unknown>;
    for (const key of objectKeys(b as Record<string, unknown>)) {
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
   * The hook will be called before constructing the url. If it returns a table, it's used instead. It may modify *params* and *req*
   * @param initial Initial configuration for the API call
   * @returns A function that performs a fetch with the options requested
   * @typeparam TRet is the return type of the API call
   * @typeparam TRequired is the required query parameters for the API call
   * @typeparam TRequiredFetch is the required fetch options for the API call
   */
  private static init<
    TRet extends TRetType = TRetType,
    TRequired extends TRequiredType = TRequiredType,
    TRequiredFetch extends TRequiredFetchType = TRequiredFetchType,
  >(initial: {
    path: string;
    params?: ParamMap;
    fetch?: RequestInit;
    hook?: RequestHook<TRequired, TRequiredFetch>;
  }) {
    const initOpt = initial.params ?? {};
    const initFetchOpt = initial.fetch ?? {};
    const { path, hook } = initial;
    type Ret = (TRet & { ok: true }) | (VercelResponse.error & { ok: false });
    //> Returns a function for fetching
    return async (
      options: TRequired & (ParamMap | undefined),
      fetchOptions: TRequiredFetch & (RequestInit | undefined)
    ): Promise<Ret> => {
      options ??= {} as typeof options;
      const mergedOptions = { ...initOpt, ...options };
      const mergedFetchOptions = this.mergeHeaders(initFetchOpt, fetchOptions);

      // Final merged after hook. Note: these have a broader type to allow hook to return anything.
      let finalOptions: ParamMap = mergedOptions,
        finalFetchOptions: RequestInit = mergedFetchOptions;
      if (hook) {
        const hookOptions = { params: mergedOptions, req: mergedFetchOptions };
        const res = hook(hookOptions); // This may modify them, or return them!
        if (res) {
          finalOptions = res.params;
          finalFetchOptions = res.req;
        }
      }

      const url = this.base(path, finalOptions);
      const response = await fetch(url, finalFetchOptions).catch(e => ({
        error: {
          code: "FetchError",
          message: `A Network Error Occured: ${e}`,
        },
      }));
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
          r => r as TRet | VercelResponse.error,
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

  public static deployments = this.init<
    VercelResponse.deployment,
    { projectId: string; limit?: number },
    AuthHeaders
  >({
    path: "/v6/deployments",
    fetch: {
      method: "GET",
    },
  });
  public static projectInfo = this.init<
    VercelResponse.info.project,
    { projectId: string },
    AuthHeaders
  >({
    path: "/v9/projects/:projectId",
    fetch: {
      method: "GET",
    },
  });
  public static userInfo = this.init<
    VercelResponse.info.user,
    TRequiredType,
    AuthHeaders
  >({
    path: "/v2/user",
    fetch: {
      method: "GET",
    },
  });
  public static environment = {
    getAll: this.init<
      VercelResponse.environment.getAll,
      { projectId: string },
      AuthHeaders
    >({
      path: "/v8/projects/:projectId/env",
      params: { decrypt: "true" },
      fetch: {
        method: "GET",
      },
    }),
    remove: this.init<
      VercelResponse.environment.remove,
      { projectId: string; id: string },
      AuthHeaders
    >({
      path: "/v9/projects/:projectId/env/:id",
      fetch: {
        method: "DELETE",
      },
    }),
    create: this.init<
      VercelResponse.environment.create,
      {
        projectId: string;
        body: {
          key: string;
          value: string;
          target: VercelTargets[];
          type: NonNullable<VercelEnvironmentInformation["type"]>;
        };
      },
      AuthHeaders
    >({
      hook: o => ({
        // turn the body param into a URLSearchParams object
        req: { ...o.req, body: JSON.stringify(o.params.body) },
        params: { ...o.params, body: undefined },
      }),
      path: "/v10/projects/:projectId/env",
      fetch: {
        method: "POST",
      },
    }),
    edit: this.init<
      VercelResponse.environment.edit,
      {
        projectId: string;
        id: string;
        body: { value: string; target: VercelTargets[] };
      },
      { headers: { Authorization: string } }
    >({
      hook: o => ({
        // turn the body param into a URLSearchParams object
        req: { ...o.req, body: JSON.stringify(o.params.body) },
        params: { ...o.params, body: undefined },
      }),
      path: "/v9/projects/:projectId/env/:id",
      fetch: {
        method: "PATCH",
      },
    }),
  };
  public static oauth = {
    accessToken: this.init<
      VercelResponse.oauth.accessToken,
      {
        body: {
          code: string;
          redirect_uri: string;
          client_id: string;
          client_secret: string;
        };
      }
    >({
      hook: o => ({
        // turn the body param into a URLSearchParams object
        req: { ...o.req, body: new URLSearchParams(o.params.body) },
        params: { ...o.params, body: undefined },
      }),
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
