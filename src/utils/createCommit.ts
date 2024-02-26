import { Commit } from "../features/Commit";
import type { Meta, Provider } from "../features/models";
import { getProvider } from "./getProvider";

export function getCommit(meta?: Meta<Provider>): Commit | undefined {
  const provider = meta && getProvider(meta);
  if (!provider) return;
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
