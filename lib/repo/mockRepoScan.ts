import type { ArtifactRef } from "@/lib/types/graph";

export function mockRepoScan(): ArtifactRef[] {
  return [
    {
      id: "artifact-reset-service",
      path: "src/auth/reset-token.ts",
      kind: "service",
      role: "Token lifecycle",
      confidence: 0.9,
      evidence: "Mock scan path match.",
    },
    {
      id: "artifact-reset-test",
      path: "tests/reset-token.test.ts",
      kind: "test",
      role: "Token reuse coverage",
      confidence: 0.88,
      evidence: "Mock scan path match.",
    },
  ];
}
