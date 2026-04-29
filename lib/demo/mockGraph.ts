import type { GraphState } from "@/lib/types/graph";

export const mockGraph: GraphState = {
  selectedNodeId: "feature-password-reset",
  timeline: [],
  features: [
    {
      id: "feature-auth",
      name: "Auth",
      description: "Account access and identity flows.",
      source: "prd",
      status: "not_started",
      confidence: 0.82,
      acceptanceCriteria: [],
      artifacts: [],
      evidence: [
        {
          id: "evidence-auth-prd",
          type: "prd",
          title: "PRD section",
          detail: "Password Reset belongs to the broader Auth area.",
          confidence: 0.82,
        },
      ],
    },
    {
      id: "feature-password-reset",
      name: "Password Reset",
      description: "Users can request a reset email and safely use a reset token.",
      source: "prd",
      status: "risk",
      confidence: 0.94,
      riskSummary: "Token reuse still needs passing test evidence.",
      acceptanceCriteria: [
        {
          id: "ac-reset-email",
          text: "User can request a reset email.",
          status: "unknown",
          evidenceIds: ["evidence-prd-password-reset"],
        },
        {
          id: "ac-token-expiry",
          text: "Reset token expires after 15 minutes.",
          status: "unknown",
          evidenceIds: ["evidence-prd-password-reset"],
        },
        {
          id: "ac-token-reuse",
          text: "Reset token cannot be reused.",
          status: "missing_evidence",
          evidenceIds: ["evidence-prd-password-reset"],
        },
        {
          id: "ac-invalid-token",
          text: "Invalid token shows a clear error.",
          status: "unknown",
          evidenceIds: ["evidence-prd-password-reset"],
        },
        {
          id: "ac-reuse-test",
          text: "There is a test for token reuse.",
          status: "missing_evidence",
          evidenceIds: ["evidence-prd-password-reset"],
        },
      ],
      artifacts: [
        {
          id: "artifact-reset-ui",
          path: "app/auth/reset-password/page.tsx",
          kind: "ui",
          role: "Reset request UI",
          confidence: 0.62,
          evidence: "Likely UI entrypoint for reset password.",
        },
        {
          id: "artifact-reset-api",
          path: "app/api/auth/reset/route.ts",
          kind: "api",
          role: "Reset endpoint",
          confidence: 0.71,
          evidence: "API route name matches password reset.",
        },
        {
          id: "artifact-reset-service",
          path: "src/auth/reset-token.ts",
          kind: "service",
          role: "Token lifecycle",
          confidence: 0.9,
          evidence: "Service path directly matches reset token behavior.",
        },
        {
          id: "artifact-reset-test",
          path: "tests/reset-token.test.ts",
          kind: "test",
          role: "Token reuse coverage",
          confidence: 0.88,
          evidence: "Test file directly matches token behavior.",
        },
      ],
      evidence: [
        {
          id: "evidence-prd-password-reset",
          type: "prd",
          title: "PRD source",
          detail: "Password Reset criteria extracted from pasted PRD.",
          confidence: 0.94,
        },
      ],
    },
  ],
  edges: [
    {
      id: "edge-auth-password-reset",
      from: "feature-auth",
      to: "feature-password-reset",
      type: "contains",
      confidence: 0.86,
      evidenceIds: ["evidence-auth-prd"],
    },
  ],
};
