/* eslint-disable @typescript-eslint/naming-convention */
import * as vscode from "vscode";
import http from "http";
import type { Api } from "./Api";
import { listen } from "async-listen";
// These are constants configured in the vercel dashboard. They must match those values!
const OAUTH_PORT = 9615;
const OAUTH_PATH = "/oauth-complete";
const OAUTH_URL = `http://localhost:${OAUTH_PORT}${OAUTH_PATH}`;
const CLIENT_ID = "oac_dJy0AdgVEITrkrnYF5Y4nSlo";
const CLIENT_SEC = "NPBb5J2ZNrlhX3W98DCPS1o1";

const vercelSlug = "vercel-project-manager";

/** successMessage is html */
async function doOauth(
  port: number,
  pathname?: string // If present, will ignore all other paths
): Promise<URL> {
  const server = http.createServer();
  await listen(server, port, "127.0.0.1");
  // url.searchParams.set('next', `http://localhost:${port}`);

  let resolve: (value: URL) => void, reject: (reason: any) => void;
  const p = new Promise<URL>(
    (_resolve, _reject) => ((resolve = _resolve), (reject = _reject))
  );

  try {
    server.once("request", function (req, res) {
      // Close the HTTP connection to prevent
      // `server.close()` from hanging
      res.setHeader("connection", "close");
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      if (url.pathname !== pathname) {
        res.writeHead(404);
        res.end();
        return;
      }
      resolve(url);
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body>Authentication successful! You can now close this window.</body></html>"
      );
    });
    server.once("error", e => reject(e));
    const link = `https://vercel.com/integrations/${vercelSlug}/new`;
    void vscode.window.showInformationMessage(`Please sign in in your browser`);
    await vscode.env.openExternal(vscode.Uri.parse(link)); // open in a browser
    return await p;
  } finally {
    server.close();
  }
}
export type OauthResult = { accessToken: string; teamId: string | null };
async function getTokenFromCode(
  code: string,
  api: Api
): Promise<OauthResult | undefined> {
  const res = await api.oauth.accessToken(
    {
      body: {
        code: code,
        redirect_uri: OAUTH_URL,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SEC,
      },
    },
    undefined
  );
  if (!res.ok) return;
  const { access_token, team_id } = res; // eslint-disable-line @typescript-eslint/naming-convention
  return { accessToken: access_token, teamId: team_id };
}
export async function getTokenOauth(
  api: Api
): Promise<OauthResult | undefined> {
  // Check internet before starting a server and a browser
  const req = await fetch("https://vercel.com").catch(() => null);
  if (!req?.ok) {
    const msg = `Failed to authenticate with Vercel (Network error).`;
    return void vscode.window.showErrorMessage(msg);
  }
  const resUrl = await doOauth(OAUTH_PORT, OAUTH_PATH);
  const code = resUrl.searchParams.get("code");
  if (!code) {
    const msg = "Failed to authenticate with Vercel (No code).";
    return void vscode.window.showErrorMessage(msg);
  }
  const accessToken = await getTokenFromCode(code, api);
  if (!accessToken?.accessToken) {
    const msg = `Failed to authenticate with Vercel. (No access token)`;
    return void vscode.window.showErrorMessage(msg);
  }
  return accessToken;
}
