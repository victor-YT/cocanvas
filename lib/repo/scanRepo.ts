import { mockRepoScan } from "./mockRepoScan";

export async function scanRepo(repoPath: string) {
  void repoPath;

  // TODO: Use Node fs + simple heuristics. Keep output as ArtifactRef[].
  return mockRepoScan();
}
