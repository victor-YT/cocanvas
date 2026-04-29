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
  return line.replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
}

function isBullet(line: string) {
  return /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line);
}

function isLikelyFeatureHeading(line: string) {
  if (isBullet(line)) {
    return false;
  }

  if (/^(overview|background|goals?|non-goals?|scope|requirements?|acceptance criteria|notes?)\b:?$/i.test(line)) {
    return false;
  }

  return line.length <= 80;
}

export function mockParsePrd(sourceText: string): ParsedPrd {
  const lines = extractLines(sourceText);
  const title = stripBullet(
    lines.find((line) => !isBullet(line)) ?? "Password Reset",
  );
  const sections: Array<{ title: string; criteria: string[] }> = [];
  let currentSection: { title: string; criteria: string[] } | undefined;

  for (const line of lines.slice(1)) {
    if (isLikelyFeatureHeading(line)) {
      currentSection = {
        title: stripBullet(line).replace(/:$/, ""),
        criteria: [],
      };
      sections.push(currentSection);
      continue;
    }

    if (isBullet(line)) {
      const criterion = stripBullet(line);

      if (!currentSection) {
        currentSection = {
          title,
          criteria: [],
        };
        sections.push(currentSection);
      }

      currentSection.criteria.push(criterion);
    }
  }

  const criteriaLines = sections.flatMap((section) => section.criteria);
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
    features: (sections.length > 0 ? sections : [{ title, criteria: criteriaLines }]).map(
      (section) => {
        const criteria = section.criteria.length > 0 ? section.criteria : fallbackCriteria;

        return {
          id: `feature-${slug(section.title) || "password-reset"}`,
          name: section.title,
          description: `${section.title} behavior extracted from the pasted PRD.`,
          acceptanceCriteria: criteria.map((text, index) => ({
          id: `ac-${slug(text) || index + 1}`,
          text,
          status: /\btest|cannot|invalid\b/i.test(text)
            ? "missing_evidence"
            : "unknown",
          evidenceIds: [],
        })),
        };
      },
    ),
  };
}
