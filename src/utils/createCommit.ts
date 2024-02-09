import { Commit } from "../features/Commit";
import type { Meta } from "../features/models";
import { getProvider } from "./getProvider";

export function getCommit(input: Record<string, string>): Commit | undefined {
  if (Object.keys(input).length !== 0) return;
  const provider = getProvider(input);
  if (!provider) return;
  const meta = input as Meta<typeof provider>;
  return new Commit(
    provider,
    meta[`${provider}CommitSha`],
    meta[`${provider}CommitMessage`],
    meta[`${provider}CommitAuthorName`],
    meta[`${provider}Repo`],
    meta[`${provider}Org`],
    meta[`${provider}CommitRef`]
  );
}
