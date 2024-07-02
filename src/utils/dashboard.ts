import type { VercelManager } from "../features/VercelManager";
import * as vscode from "vscode";

async function getBaseURL(
  vercel: VercelManager
): Promise<vscode.Uri | undefined> {
  const teamId = await vercel.teamId();
  const projectAccountId = (await vercel.project.getInfo())?.accountId;
  // If the current progect is a team project, use the team dashboard URL
  if (teamId && projectAccountId === teamId) {
    const userURL = vscode.workspace
      .getConfiguration("vercel")
      .get("TeamDashboardURL");
    if (typeof userURL !== "string" || userURL.length === 0) {
      return void vscode.window.showErrorMessage(
        "To open the team dashboard, please set the TeamDashboardURL setting."
      );
    }
    return vscode.Uri.parse(userURL);
  }

  // Else, use the default URL and append the username
  const base = vscode.Uri.parse("https://vercel.com");
  const user = await vercel.user.getInfo();
  if (!user)
    return void vscode.window.showErrorMessage("Could not get user info!");
  return vscode.Uri.joinPath(base, user.username);
}
export async function getProjectDashboard(
  vercel: VercelManager,
  path: string
): Promise<vscode.Uri | undefined> {
  const projectInfo = await vercel.project.getInfo();
  if (!projectInfo) return;
  const base = await getBaseURL(vercel);
  if (!base) return;
  return vscode.Uri.joinPath(base, projectInfo.name, path);
}
export default getProjectDashboard;
