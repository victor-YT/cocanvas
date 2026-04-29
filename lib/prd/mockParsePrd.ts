import type { ParsedPrd } from "@/lib/types/prd";

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function extractLines(sourceText: string) {
  return sourceText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function stripBullet(line: string) {
  return line.replace(/^[-*]\s+/, "").trim();
}

export function mockParsePrd(sourceText: string): ParsedPrd {
  const lines = extractLines(sourceText);
  const title = stripBullet(
    lines.find((line) => !/^[-*]\s+/.test(line)) ?? "Password Reset",
  );
  const criteriaLines = lines
    .filter((line) => /^[-*]\s+/.test(line))
    .map(stripBullet);
  const fallbackCriteria = [
    "User can request a reset email.",
    "Reset token expires after 15 minutes.",
    "Reset token cannot be reused.",
    "Invalid token shows a clear error.",
    "There is a test for token reuse.",
  ];

  return {
    title,
    sourceText,
    features: [
      {
        id: `feature-${slug(title) || "password-reset"}`,
        name: title,
        description: `${title} behavior extracted from the pasted PRD.`,
        acceptanceCriteria: (criteriaLines.length > 0
          ? criteriaLines
          : fallbackCriteria
        ).map((text, index) => ({
          id: `ac-${slug(text) || index + 1}`,
          text,
          status: /\btest|cannot|invalid\b/i.test(text)
            ? "missing_evidence"
            : "unknown",
          evidenceIds: [],
        })),
      },
    ],
  };
}
