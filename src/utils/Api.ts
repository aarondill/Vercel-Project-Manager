/* eslint-disable @typescript-eslint/naming-convention */
import type { RequestInfo, RequestInit } from "node-fetch";
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
import type { TokenManager } from "../features/TokenManager";
import type { OauthResult } from "./oauth";
import { log } from "../logging";

/** The default TRet */
type TRetType = Record<PropertyKey, unknown> | unknown[];
/** The default TRequired */
type TRequiredType = ParamMap | undefined;
/** The default TRequiredFetch */
type TRequiredFetchType = RequestInit | undefined;
type RequestHook<TRequired, TRequiredFetch> = <
  Params extends ParamMap & TRequired,
  Req extends RequestInit & TRequiredFetch,
>(opts: {
  params: Params;
  req: Req;
  // eslint-disable-next-line @typescript-eslint/no-invalid-void-type
}) => { params: ParamMap; req: RequestInit } | undefined | null | void;

function logError<T extends VercelResponse.error>(
  e: T,
  isServerSide = false
): T & { ok: false } {
  const type = isServerSide ? "Vercel Server Error" : "Error";
  const msg = `${type}(${e.error?.code}): ${e.error?.message ?? "Unknown"}`;
  log(msg);
  return { ...e, ok: false };
}
// Makes a request using fetch and returns the response after parsing
async function makeLoggedRequest<TRet extends TRetType>(
  url: URL | RequestInfo,
  opts?: RequestInit
): Promise<(TRet & { ok: true }) | (VercelResponse.error & { ok: false })> {
  log(`API request to ${url.toString()}`);
  let response; // Get the fetch response
  try {
    response = await fetch(url, opts);
  } catch (e) {
    const message = `A Network Error Occured: ${String(e)}`;
    return logError({ error: { code: "FetchError", message } });
  }
  let data; // json parse the response body
  try {
    data = (await response.json()) as TRet | VercelResponse.error;
  } catch (e) {
    const message = `Failed to parse response json: ${e?.toString()}`;
    return logError({ error: { code: "InvalidResponse", message } });
  }
  if (!data || typeof data !== "object") {
    const message = `Returned data was not an object: ${String(data)}`;
    return logError({ error: { code: "InvalidResponse", message } });
  }
  if (typeGuard<VercelResponse.error>(data, "error" in data)) {
    return logError(data, true);
  }
  return { ...data, ok: true };
}

export class Api {
  constructor(private token: TokenManager) {}
  /** Combines two objects, combining any object properties down one level
   * eg. {a: 1, b: { num: 2 }} and {c: 3, a: 4, b: { num2: 5 }}
   * {a: 4, b: {num: 2, num2: 5}, c: 3 }
   * Any non-object properties are overwritten if on a, or overwrite if on b.
   * Both arguments should be objects. if they are not objects, you will likely get an empty object back.
   */
  private mergeHeaders<A extends object>(a: A, b?: undefined): A;
  private mergeHeaders<A extends object, B extends object>(a: A, b: B): A & B; // This isn't *quite* correct, but it works for now.
  private mergeHeaders<A extends object, B extends object | undefined>(
    a: A,
    b?: B
  ): A & B;
  private mergeHeaders<A extends object, B extends object | undefined>(
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

  /** Utility getter to return the proper fetch options for authentication  */
  private async authHeader(auth: OauthResult) {
    return { headers: { Authorization: `Bearer ${auth.accessToken}` } };
  }

  private baseUrl = "https://api.vercel.com";
  private base(path?: string, query?: ParamMap) {
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
  private init<
    TRet extends TRetType = TRetType,
    TRequired extends TRequiredType = TRequiredType,
    TRequiredFetch extends TRequiredFetchType = TRequiredFetchType,
  >(initial: {
    path: string;
    params?: ParamMap;
    authorization?: boolean;
    fetch?: RequestInit;
    hook?: RequestHook<TRequired, TRequiredFetch>;
  }) {
    const initOpt = initial.params ?? {};
    const initFetchOpt = initial.fetch ?? {};
    const useAuth = initial.authorization ?? true;
    const { path, hook } = initial;
    //> Returns a function for fetching
    return async (
      options: TRequired & (ParamMap | undefined),
      fetchOptions: TRequiredFetch & (RequestInit | undefined)
    ) => {
      options ??= {} as typeof options;
      const mergedOptions = { ...initOpt, ...options };
      let mergedFetchOptions = this.mergeHeaders(initFetchOpt, fetchOptions);
      if (useAuth) {
        const auth = await this.token.getAuth();
        if (!auth?.accessToken) {
          return logError({
            error: { code: "NOAUTH", message: "User is not authenticated." },
          });
        }
        const authHeader = this.authHeader(auth);
        mergedFetchOptions = this.mergeHeaders(mergedFetchOptions, authHeader);
        mergedOptions.teamId = auth.teamId;
      }

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
      return await makeLoggedRequest<TRet>(url, finalFetchOptions);
    };
  }

  public deployments = this.init<
    VercelResponse.deployment,
    { projectId: string; limit?: number; teamId?: string }
  >({
    path: "/v6/deployments",
    fetch: {
      method: "GET",
    },
  });
  public projectInfo = this.init<
    VercelResponse.info.project,
    { projectId: string; teamId?: string }
  >({
    path: "/v9/projects/:projectId",
    fetch: {
      method: "GET",
    },
  });
  public userInfo = this.init<
    VercelResponse.info.user,
    { teamId?: string } | undefined
  >({
    path: "/v2/user",
    fetch: {
      method: "GET",
    },
  });
  public environment = {
    getAll: this.init<
      VercelResponse.environment.getAll,
      { projectId: string; teamId?: string }
    >({
      path: "/v8/projects/:projectId/env",
      params: { decrypt: "true" },
      fetch: {
        method: "GET",
      },
    }),
    remove: this.init<
      VercelResponse.environment.remove,
      { projectId: string; id: string; teamId?: string }
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
        teamId?: string;
      }
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
        teamId?: string;
      }
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
  public oauth = {
    accessToken: this.init<
      VercelResponse.oauth.accessToken,
      {
        body: {
          code: string;
          redirect_uri: string;
          client_id: string;
          client_secret: string;
        };
        teamId?: string;
      }
    >({
      hook: o => ({
        // turn the body param into a URLSearchParams object
        req: { ...o.req, body: new URLSearchParams(o.params.body) },
        params: { ...o.params, body: undefined },
      }),
      path: "/v2/oauth/access_token",
      authorization: false, // The user doesn't need to be authorized to use this endpoint!
      fetch: {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
      },
    }),
  };
}
