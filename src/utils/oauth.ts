import * as vscode from "vscode";
import http from "http";
const OAUTH_PORT = 9615;
const OAUTH_PATH = "/oauth-complete";
const OAUTH_URL = `http://localhost:${OAUTH_PORT}${OAUTH_PATH}`;
const CLIENT_ID = "oac_dJy0AdgVEITrkrnYF5Y4nSlo";
const CLIENT_SEC = "NPBb5J2ZNrlhX3W98DCPS1o1";

const vercelSlug = "vercel-project-manager";
const link = `https://vercel.com/integrations/${vercelSlug}/new`;

/** successMessage is html */
async function serveResponse(
  port: number,
  pathname?: string // If present, will ignore all other paths
): Promise<URL> {
  return await new Promise((resolve, reject) => {
    const server = http.createServer(async function (req, res) {
      const url = req.url && new URL(req.url, `http://${req.headers.host}`);
      if (!url || url.pathname !== pathname) {
        res.writeHead(404);
        res.end();
        if (!url) reject(new Error("No URL provided"));
        return;
      }
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(
        "<html><body>Authentication successful! You can now close this window.</body></html>"
      );
      server.close();
      return resolve(url);
    });
    server.on("error", e => {
      if (!("code" in e) || e.code !== "EADDRINUSE") return;
      // console.error("Address in use, retrying...");
      let tries = 0;
      setTimeout(() => {
        if (tries++ > 5) return reject(e); // Retry up to 5 times
        server.close();
        server.listen(port);
      }, 1000);
    });
    server.listen(port);
  });
}
async function getTokenFromCode(code: string): Promise<string | undefined> {
  const url = new URL("https://api.vercel.com/v2/oauth/access_token");
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
  };
  const params = new URLSearchParams({
    code: code,
    redirect_uri: OAUTH_URL, // eslint-disable-line @typescript-eslint/naming-convention
    client_id: CLIENT_ID, // eslint-disable-line @typescript-eslint/naming-convention
    client_secret: CLIENT_SEC, // eslint-disable-line @typescript-eslint/naming-convention
  });
  const res = await fetch(url, { headers, method: "POST", body: params });
  if (!res.ok) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const jsonRes = (await res.json()) as { access_token: string };
  const accessToken = jsonRes.access_token;
  return accessToken;
}
export async function getTokenOauth() {
  // Check well known ip before starting a server and a browser
  const req = await fetch("https://1.1.1.1").catch(() => null);
  if (!req || !req.ok) {
    const msg = "Failed to authenticate with Vercel (Network error!).";
    return await vscode.window.showErrorMessage(msg);
  }
  const resUrl = serveResponse(OAUTH_PORT, OAUTH_PATH); // don't await it here! We need to open the url before it's meaningful.
  await vscode.env.openExternal(vscode.Uri.parse(link)); // open in a browser
  const code = (await resUrl).searchParams.get("code");
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
