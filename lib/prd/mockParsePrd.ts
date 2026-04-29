import type { ParsedPrd } from "@/lib/types/prd";

export function mockParsePrd(sourceText: string): ParsedPrd {
  return {
    title: "Password Reset",
    sourceText,
    features: [
      {
        id: "feature-password-reset",
        name: "Password Reset",
        description: "Users can request a reset and safely use a single-use token.",
        acceptanceCriteria: [
          {
            id: "ac-reset-email",
            text: "User can request a reset email.",
            status: "unknown",
            evidenceIds: [],
          },
          {
            id: "ac-token-expiry",
            text: "Reset token expires after 15 minutes.",
            status: "unknown",
            evidenceIds: [],
          },
          {
            id: "ac-token-reuse",
            text: "Reset token cannot be reused.",
            status: "missing_evidence",
            evidenceIds: [],
          },
        ],
      },
    ],
  };
}
