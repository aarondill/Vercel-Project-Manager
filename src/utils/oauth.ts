import * as vscode from "vscode";
import http from "http";
import { Api } from "./Api";
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
async function getTokenFromCode(code: string): Promise<string | undefined> {
  const res = await Api.oauth.accessToken(
    {
      body: {
        code: code,
        redirect_uri: OAUTH_URL, // eslint-disable-line @typescript-eslint/naming-convention
        client_id: CLIENT_ID, // eslint-disable-line @typescript-eslint/naming-convention
        client_secret: CLIENT_SEC, // eslint-disable-line @typescript-eslint/naming-convention
      },
    },
    undefined
  );
  if (!res.ok) return;
  return res.access_token;
}
export async function getTokenOauth() {
  // Check well known ip before starting a server and a browser
  const req = await fetch("https://1.1.1.1").catch(() => null);
  if (!req?.ok) {
    const msg = `Failed to authenticate with Vercel (Network error!). ${req?.statusText}`;
    return await vscode.window.showErrorMessage(msg);
  }
  const resUrl = await doOauth(OAUTH_PORT, OAUTH_PATH);
  const code = resUrl.searchParams.get("code");
  if (!code) {
    const msg = "Failed to authenticate with Vercel (Couldn't get code).";
    return await vscode.window.showErrorMessage(msg);
  }
  const accessToken = await getTokenFromCode(code);
  if (!accessToken) {
    const msg = `Failed to authenticate with Vercel. (Couldn't get access token)`;
    return await vscode.window.showErrorMessage(msg);
  }
  return accessToken;
}
